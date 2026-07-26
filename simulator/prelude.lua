-- mt.* prelude: pure-Lua helper library shared verbatim by the host plugin
-- (embedded at build time) and the VSCode simulator extension (copied at build
-- time). Because two runtimes load this same file, it must stay pure Lua 5.4:
-- no I/O or host dependencies. Most helpers are pure functions; mt.storage
-- holds initialization-time constants, and documented mt.layout helpers mutate
-- their target objects. Host-side responsibilities (print wiring, randomseed
-- reset, sandboxing) live outside this file.
--
-- Maintainability rules for this file:
--   * Every public function carries LuaLS (---@) type annotations.
--   * No metaprogramming: every public key (for example mt.ease.out_quad) is
--     assigned explicitly on its own greppable line.
--   * Naming and single-exit style follow the C++ rules in AGENTS.md.

---@class MtEase
mt = mt or {}
mt.layout = {}
mt.path = {}
mt.timeline = {}
mt.text = {}

-- Rebuilt by the host before each OnInitialize run, then frozen with
-- mt.__freeze (see the storage section at the bottom of this file).
---@type table
mt.storage = mt.storage or {}

---------------------------------------------------------------------------
-- Range / interpolation utilities
---------------------------------------------------------------------------

---Clamp value into [low, high].
---@param value number
---@param low number
---@param high number
---@return number
function mt.clamp(value, low, high)
    local result = value
    if value < low then
        result = low
    elseif value > high then
        result = high
    end
    return result
end

---Clamp value into [0, 1].
---@param value number
---@return number
function mt.saturate(value)
    return mt.clamp(value, 0.0, 1.0)
end

---Linear interpolation from `from` to `to` by `t` (not clamped).
---@param from number
---@param to number
---@param t number
---@return number
function mt.lerp(from, to, t)
    return from + (to - from) * t
end

---Return the interpolation factor of `value` between `from` and `to`.
---@param from number
---@param to number
---@param value number
---@return number
function mt.inverse_lerp(from, to, value)
    local result = 0.0
    if from ~= to then
        result = (value - from) / (to - from)
    end
    return result
end

---Map value from [inLow, inHigh] to [outLow, outHigh].
---@param value number
---@param inLow number
---@param inHigh number
---@param outLow number
---@param outHigh number
---@param clamped boolean|nil clamp the normalized position into [0, 1]
---@return number
function mt.remap(value, inLow, inHigh, outLow, outHigh, clamped)
    local t = (value - inLow) / (inHigh - inLow)
    if clamped then
        t = mt.clamp(t, 0.0, 1.0)
    end
    return outLow + (outHigh - outLow) * t
end

---Wrap value into the half-open range [low, high).
---@param value number
---@param low number
---@param high number
---@return number
function mt.wrap(value, low, high)
    local result = low
    local range = high - low
    if range > 0.0 then
        result = low + (value - low) % range
    end
    return result
end

---Interpolate degrees along the shortest angular path.
---@param from number
---@param to number
---@param t number
---@return number
function mt.lerp_angle(from, to, t)
    local delta = (to - from + 180.0) % 360.0 - 180.0
    return from + delta * t
end

---Map a one-based index evenly across [0, 1].
---@param index number
---@param count number
---@return number
function mt.distribute(index, count)
    local result = 0.0
    if count > 1.0 then
        result = mt.saturate((index - 1.0) / (count - 1.0))
    end
    return result
end

---Smooth 0 -> 1 transition (Hermite) as value crosses [edge0, edge1].
---@param edge0 number
---@param edge1 number
---@param value number
---@return number
function mt.smoothstep(edge0, edge1, value)
    local t = mt.clamp((value - edge0) / (edge1 - edge0), 0.0, 1.0)
    return t * t * (3.0 - 2.0 * t)
end

---Smooth bell-shaped influence weight: 1 at the centre, easing toward 0 with
---distance. Unlike smoothstep it never reaches a hard cutoff, which is what
---makes travelling highlights and wave crests read as continuous.
---@param distance number distance from the centre of the effect
---@param radius number distance at which the weight has decayed to about 0.37
---@return number weight in the range 0 to 1
function mt.falloff(distance, radius)
    local result = 0.0
    if radius ~= 0.0 then
        local normalized = distance / radius
        result = math.exp(-(normalized * normalized))
    end
    return result
end

---Converts a polar direction into a canvas-space offset pair, so scatter,
---gather, and orbit motions can be written without spelling out cos/sin.
---@param angleDegrees number direction in degrees, 0 = right, positive clockwise
---@param radius number distance along that direction
---@return number offsetX
---@return number offsetY
function mt.polar_offset(angleDegrees, radius)
    local radians = angleDegrees * (math.pi / 180.0)
    return math.cos(radians) * radius, math.sin(radians) * radius
end

---Periodic ramp 0 -> 1 repeating every `period` seconds.
---@param t number
---@param period number
---@return number
function mt.cycle(t, period)
    return (t % period) / period
end

---Bounce 0 -> 1 -> 0 over one `period`.
---@param t number
---@param period number
---@return number
function mt.pingpong(t, period)
    local phase = (t % period) / period * 2.0
    local result = phase
    if phase > 1.0 then
        result = 2.0 - phase
    end
    return result
end

---Local time normalization for per-index staggered animation: index i
---(1-based) starts `delay * (i - 1)` seconds late and runs for `duration`
---seconds. Returns progress in [0, 1].
---@param time number
---@param index integer
---@param delay number
---@param duration number
---@return number
function mt.stagger(time, index, delay, duration)
    return mt.clamp((time - delay * (index - 1)) / duration, 0.0, 1.0)
end

---@class MtKeyframe
---@field t number keyframe time; keys must be listed in ascending t order
---@field v number|MtColor keyframe value (numbers and RGBA color tables can not be mixed in one list)
---@field ease string|fun(t: number): number|nil easing for the segment that ENDS at this key: an mt.ease name (for example "out_bounce") or a progress function; linear when omitted

---Closed-form piecewise keyframe interpolation: returns the value of the key
---track at `time`. Before the first key the first value is returned, after the
---last key the last value; between two keys the segment progress is shaped by
---the destination key's `ease` and interpolated (mt.color.lerp for color
---tables, mt.lerp for numbers).
---@param keys MtKeyframe[]
---@param time number
---@return number|MtColor
function mt.keyframes(keys, time)
    local keyCount = #keys
    if keyCount == 0 then
        error("mt.keyframes: keys must contain at least one keyframe", 2)
    end
    local result
    if time <= keys[1].t then
        result = keys[1].v
    elseif time >= keys[keyCount].t then
        result = keys[keyCount].v
    else
        for index = 2, keyCount do
            local nextKey = keys[index]
            if time <= nextKey.t then
                local previousKey = keys[index - 1]
                local span = nextKey.t - previousKey.t
                local progress = 0.0
                if span > 0.0 then
                    progress = (time - previousKey.t) / span
                end
                local easing = nextKey.ease
                if type(easing) == "string" then
                    local easingFunction = mt.ease[easing]
                    if easingFunction == nil then
                        error("mt.keyframes: unknown easing '" .. easing .. "'", 2)
                    end
                    progress = easingFunction(progress)
                elseif type(easing) == "function" then
                    progress = easing(progress)
                end
                if type(previousKey.v) == "table" then
                    result = mt.color.lerp(previousKey.v, nextKey.v, progress)
                else
                    result = mt.lerp(previousKey.v, nextKey.v, progress)
                end
                break
            end
        end
    end
    return result
end

---------------------------------------------------------------------------
-- Stateless hash random
---------------------------------------------------------------------------

-- 32-bit avalanche mix (lowbias32 by Chris Wellons).
---@param value integer
---@return integer
local function mixInteger32(value)
    local mixed = value & 0xffffffff
    mixed = (mixed ~ (mixed >> 16)) * 0x7feb352d & 0xffffffff
    mixed = (mixed ~ (mixed >> 15)) * 0x846ca68b & 0xffffffff
    mixed = mixed ~ (mixed >> 16)
    return mixed
end

local kGoldenRatio32 = 0x9e3779b9

---Order-independent random in [0, 1): the value depends only on
---(seed, index), never on call order. Use this instead of math.random when a
---per-character / per-part stable random is needed: math.random depends on
---call order, which breaks determinism across render orders.
---@param seed integer
---@param index integer
---@return number
function mt.random(seed, index)
    local seedInteger = math.tointeger(seed) or 0
    local indexInteger = math.tointeger(index) or 0
    local mixed = mixInteger32(mixInteger32(seedInteger) ~
        (indexInteger * kGoldenRatio32 & 0xffffffff))
    return mixed / 4294967296.0
end

---Order-independent random in [low, high).
---@param seed integer
---@param index integer
---@param low number
---@param high number
---@return number
function mt.random_range(seed, index, low, high)
    return mt.lerp(low, high, mt.random(seed, index))
end

---@param value number
---@return number
local function noiseInterpolation(value)
    return value * value * (3.0 - 2.0 * value)
end

---@param lattice integer
---@param seed integer|nil
---@return number
local function latticeNoise(lattice, seed)
    return mt.random(seed or 0, lattice) * 2.0 - 1.0
end

---Deterministic smooth one-dimensional value noise in [-1, 1].
---@param x number
---@param seed integer|nil
---@return number
function mt.noise1(x, seed)
    local lattice = math.floor(x)
    local fraction = noiseInterpolation(x - lattice)
    return mt.lerp(latticeNoise(lattice, seed), latticeNoise(lattice + 1, seed), fraction)
end

---Deterministic smooth two-dimensional value noise in [-1, 1].
---@param x number
---@param y number
---@param seed integer|nil
---@return number
function mt.noise2(x, y, seed)
    local latticeX = math.floor(x)
    local latticeY = math.floor(y)
    local fractionX = noiseInterpolation(x - latticeX)
    local fractionY = noiseInterpolation(y - latticeY)
    local function sample(offsetX, offsetY)
        local latticeIndex = ((latticeX + offsetX) * 73856093) ~ ((latticeY + offsetY) * 19349663)
        return latticeNoise(latticeIndex, seed)
    end
    local low = mt.lerp(sample(0, 0), sample(1, 0), fractionX)
    local high = mt.lerp(sample(0, 1), sample(1, 1), fractionX)
    return mt.lerp(low, high, fractionY)
end

---------------------------------------------------------------------------
-- Color utilities
---------------------------------------------------------------------------

---@class MtColorUtilities
mt.color = {}

---Interpolate two RGBA color tables.
---@param from MtColor
---@param to MtColor
---@param t number
---@return MtColor
function mt.color.lerp(from, to, t)
    return {
        r = mt.lerp(from.r, to.r, t),
        g = mt.lerp(from.g, to.g, t),
        b = mt.lerp(from.b, to.b, t),
        a = mt.lerp(from.a, to.a, t),
    }
end

---Create an RGBA color from normalized HSV components.
---@param hue number
---@param saturation number
---@param value number
---@param alpha number|nil
---@return MtColor
function mt.color.from_hsv(hue, saturation, value, alpha)
    local wrappedHue = mt.wrap(hue, 0.0, 1.0) * 6.0
    local chroma = value * saturation
    local intermediate = chroma * (1.0 - math.abs(wrappedHue % 2.0 - 1.0))
    local red = 0.0
    local green = 0.0
    local blue = 0.0
    if wrappedHue < 1.0 then
        red, green = chroma, intermediate
    elseif wrappedHue < 2.0 then
        red, green = intermediate, chroma
    elseif wrappedHue < 3.0 then
        green, blue = chroma, intermediate
    elseif wrappedHue < 4.0 then
        green, blue = intermediate, chroma
    elseif wrappedHue < 5.0 then
        red, blue = intermediate, chroma
    else
        red, blue = chroma, intermediate
    end
    local match = value - chroma
    return { r = red + match, g = green + match, b = blue + match, a = alpha or 1.0 }
end

---Copy a color while replacing its alpha channel.
---@param color MtColor
---@param alpha number
---@return MtColor
function mt.color.with_alpha(color, alpha)
    return { r = color.r, g = color.g, b = color.b, a = alpha }
end

---Create an RGBA color from OKLCH components.
---@param lightness number Lightness [0, 1]
---@param chroma number Chroma [0, ~0.4]
---@param hue number Hue in [0, 1] (where 1 wraps around)
---@param alpha number|nil defaults to 1.0
---@return MtColor
function mt.color.from_oklch(lightness, chroma, hue, alpha)
    local light = lightness
    local chrom = chroma
    local h = mt.wrap(hue, 0.0, 1.0) * 2.0 * math.pi

    local a = chrom * math.cos(h)
    local b = chrom * math.sin(h)

    -- OKLab to LMS
    local l_ = light + 0.3963377774 * a + 0.2158037573 * b
    local m_ = light - 0.1055613458 * a - 0.0638541728 * b
    local s_ = light - 0.0894841775 * a - 1.2914855480 * b

    -- Non-linear LMS to Linear LMS
    local l_lin = l_ * l_ * l_
    local m_lin = m_ * m_ * m_
    local s_lin = s_ * s_ * s_

    -- LMS to Linear RGB (D65)
    local r_lin =  4.0767416621 * l_lin - 3.3077115913 * m_lin + 0.2309699292 * s_lin
    local g_lin = -1.2684380046 * l_lin + 2.6097574011 * m_lin - 0.3413193965 * s_lin
    local b_lin = -0.0041960863 * l_lin - 0.7034186147 * m_lin + 1.7076147010 * s_lin

    -- Linear RGB to sRGB gamma correction
    local function toSrgb(val)
        local res = val
        if val > 0.0031308 then
            res = 1.055 * (val ^ (1.0 / 2.4)) - 0.055
        else
            res = 12.92 * val
        end
        return mt.clamp(res, 0.0, 1.0)
    end

    return {
        r = toSrgb(r_lin),
        g = toSrgb(g_lin),
        b = toSrgb(b_lin),
        a = alpha or 1.0
    }
end

---------------------------------------------------------------------------
-- Closed-form physics-like helpers
---------------------------------------------------------------------------

---Damped oscillation settling from 1 toward 0, evaluated in closed form
---(no frame-to-frame simulation, so the result is identical for any frame
---evaluation order). The cosine term can drive the result negative while
---overshooting; that is intentional for residual displacement (offset /
---rotation). Do not treat the return value as clamped 0–1 progress.
---@param t number seconds since the motion started
---@param frequency number oscillations per second
---@param damping number exponential decay rate
---@return number
function mt.spring(t, frequency, damping)
    local result = 1.0
    if t > 0.0 then
        result = math.exp(-damping * t) * math.cos(2.0 * math.pi * frequency * t)
    end
    return result
end

---Sine wave shorthand: sin(2*pi*frequency*t + phase).
---@param t number
---@param frequency number
---@param phase number|nil defaults to 0
---@return number
function mt.wave(t, frequency, phase)
    return math.sin(2.0 * math.pi * frequency * t + (phase or 0.0))
end

---Square wave shorthand (returns -1.0 or 1.0).
---@param t number
---@param frequency number
---@param phase number|nil defaults to 0
---@return number
function mt.wave_square(t, frequency, phase)
    local val = mt.wave(t, frequency, phase)
    local result = 1.0
    if val < 0.0 then
        result = -1.0
    end
    return result
end

---Triangle wave shorthand (returns values in [-1.0, 1.0] linearly ramping).
---@param t number
---@param frequency number
---@param phase number|nil defaults to 0
---@return number
function mt.wave_triangle(t, frequency, phase)
    local phaseValue = phase or 0.0
    local normalizedTime = (t * frequency + phaseValue / (2.0 * math.pi)) % 1.0
    local result = 0.0
    if normalizedTime < 0.25 then
        result = normalizedTime * 4.0
    elseif normalizedTime < 0.75 then
        result = 2.0 - normalizedTime * 4.0
    else
        result = normalizedTime * 4.0 - 4.0
    end
    return result
end

---Sawtooth wave shorthand (returns values in [-1.0, 1.0) ramping up).
---@param t number
---@param frequency number
---@param phase number|nil defaults to 0
---@return number
function mt.wave_sawtooth(t, frequency, phase)
    local phaseValue = phase or 0.0
    local normalizedTime = (t * frequency + phaseValue / (2.0 * math.pi)) % 1.0
    return normalizedTime * 2.0 - 1.0
end

---Per-index staggered progress with configurable directional patterns.
---@param time number
---@param index integer
---@param count integer
---@param pattern string 'asc'|'desc'|'center'|'random'
---@param delay number
---@param duration number
---@param seed integer|nil used only for 'random' pattern
---@return number
function mt.stagger_pattern(time, index, count, pattern, delay, duration, seed)
    local effectiveIndex = index
    if pattern == "desc" or pattern == "right_to_left" then
        effectiveIndex = count - index + 1
    elseif pattern == "center" then
        local center = (count + 1) / 2.0
        effectiveIndex = math.abs(index - center) + 1
    elseif pattern == "random" then
        local randSeed = seed or 42
        effectiveIndex = mt.random(randSeed, index) * (count - 1) + 1
    end
    return mt.clamp((time - delay * (effectiveIndex - 1)) / duration, 0.0, 1.0)
end

---Deterministic wiggle animation helper using value noise.
---@param time number
---@param frequency number
---@param amplitude number
---@param octaves integer|nil defaults to 1
---@param seed integer|nil defaults to 0
---@return number
function mt.wiggle(time, frequency, amplitude, octaves, seed)
    local octaveCount = octaves or 1
    local seedValue = seed or 0
    local value = 0.0
    local currentFrequency = frequency
    local currentAmplitude = amplitude
    for i = 0, octaveCount - 1 do
        value = value + mt.noise1(time * currentFrequency, seedValue + i * 1000) * currentAmplitude
        currentFrequency = currentFrequency * 2.0
        currentAmplitude = currentAmplitude * 0.5
    end
    return value
end

-- Duration of one ballistic segment: the time for a point
-- starting `drop` units away from boundary, moving towards boundary with `velocity`,
-- to reach the boundary under acceleration `accel` (positive magnitude).
local function bounceSegmentDuration(drop, accel, velocity)
    local discriminant = velocity * velocity + 2.0 * accel * drop
    return (velocity + math.sqrt(math.max(discriminant, 0.0))) / accel
end

-- Maximum number of bounce segments bounce1D walks through before
-- treating the motion as settled.
local kMaxBounceIterations = 64
local kMinBounceVelocity = 1e-6

-- Default travel distance, in normalized canvas units, used by the convenience
-- bounce APIs when start_mode is "relative" and no explicit distance is given.
local kDefaultBounceTravelDistance = 0.3

-- Drag rates at or below this are treated as vacuum. The drag displacement term
-- divides two nearly equal quantities by the rate, which loses every significant
-- digit as the rate approaches zero.
local kMinimumDragRate = 1e-4

-- Floor for the compressed axis of an impact, so an extreme squash still leaves a
-- visible sliver instead of collapsing to zero height.
local kMinimumImpactStretch = 0.05

-- Below this the impulse envelope's peak is too small to normalize against, so the
-- reciprocal is skipped rather than amplified into a huge scale factor.
local kMinimumImpulseEnvelope = 1e-5

--- Internal 1D ballistic bounce calculator with integrated Squash & Stretch.
local function bounce1D(t, boundaryPos, startPos, acceleration, restitution, startVelocity, squashStrength, stretchStrength, flexibility, damping, isXAxis)
    local dir = (startPos >= boundaryPos) and 1.0 or -1.0
    local absAccel = math.abs(acceleration)
    local d0 = math.abs(startPos - boundaryPos)
    local v0 = -dir * startVelocity

    local segmentStartTime = 0.0
    local segmentStartDist = d0
    local segmentVelocity = v0
    local lastImpactTime = nil
    local lastImpactVelocity = 0.0
    local impactCount = 0
    local settled = false

    local segmentDuration = bounceSegmentDuration(segmentStartDist, absAccel, segmentVelocity)

    local iterations = 0
    while t > segmentStartTime + segmentDuration and iterations < kMaxBounceIterations do
        iterations = iterations + 1
        local impactVel = segmentVelocity - absAccel * segmentDuration
        segmentStartTime = segmentStartTime + segmentDuration
        lastImpactTime = segmentStartTime
        lastImpactVelocity = math.abs(impactVel)
        impactCount = impactCount + 1
        segmentStartDist = 0.0
        segmentVelocity = math.abs(impactVel) * restitution
        if segmentVelocity < kMinBounceVelocity then
            settled = true
            break
        end
        segmentDuration = bounceSegmentDuration(segmentStartDist, absAccel, segmentVelocity)
    end

    if iterations >= kMaxBounceIterations then
        settled = true
    end

    local pos = boundaryPos
    local currentVelocity = 0.0
    local nextImpactTime = nil

    if not settled then
        local segmentElapsed = t - segmentStartTime
        local distFromWall = segmentStartDist + segmentVelocity * segmentElapsed - 0.5 * absAccel * segmentElapsed * segmentElapsed
        pos = boundaryPos + dir * math.max(distFromWall, 0.0)
        local velInDistSpace = segmentVelocity - absAccel * segmentElapsed
        currentVelocity = dir * velInDistSpace
        nextImpactTime = segmentStartTime + segmentDuration
    end

    -- Calculate Squash and Stretch
    local deltaPrimaryScale = 0.0
    if stretchStrength > 0.0 and not settled then
        deltaPrimaryScale = deltaPrimaryScale + stretchStrength * math.abs(currentVelocity)
    end

    if not settled and lastImpactTime ~= nil and t >= lastImpactTime and squashStrength > 0.0 then
        local dt = t - lastImpactTime
        local peakTime = math.atan(flexibility, damping) / flexibility
        local peakEnv = math.sin(flexibility * peakTime) * math.exp(-damping * peakTime)
        local normScale = (peakEnv > 1e-5) and (1.0 / peakEnv) or 1.0
        local impulse = -squashStrength * lastImpactVelocity * normScale * math.sin(flexibility * dt) * math.exp(-damping * dt)
        deltaPrimaryScale = deltaPrimaryScale + impulse
    end

    local primaryStretch = math.max(1.0 + deltaPrimaryScale, 0.05)
    local secondaryStretch = 1.0 / primaryStretch

    local stretchX, stretchY, offsetRatio
    if isXAxis then
        stretchX = primaryStretch
        stretchY = secondaryStretch
        offsetRatio = dir * 0.5 * (stretchX - 1.0)
    else
        stretchX = secondaryStretch
        stretchY = primaryStretch
        offsetRatio = 0.5 * (stretchY - 1.0)
    end

    return pos, stretchX, stretchY, offsetRatio, currentVelocity, lastImpactTime, nextImpactTime, impactCount, settled
end

---Closed-form ballistic bounce against a ground plane with integrated,
---continuous Squash & Stretch and ground pinning offset calculation.
---Supports both table configuration and positional arguments.
---@param paramsOrT table|number configuration table or time t
----@param groundY number|nil ground Y Canvas coordinate
----@param startY number|nil start Y Canvas coordinate
----@param gravity number|nil downward gravity magnitude
----@param restitution number|nil restitution coefficient in [0, 1)
----@param startVelocity number|nil initial upward velocity
----@param squashStrength number|nil impact squash strength coefficient
----@param stretchStrength number|nil in-air velocity stretch coefficient
----@param flexibility number|nil recovery oscillation frequency (rad/s)
----@param damping number|nil recovery damping rate
----@return table|number result object (if table input) or y (if positional input)
function mt.bounce_y(paramsOrT, groundY, startY, gravity, restitution, startVelocity, squashStrength, stretchStrength, flexibility, damping)
    local t, gY, sY, g, rest, v0
    local sqStr, stStr, flex, damp

    if type(paramsOrT) == "table" then
        t = paramsOrT.t or 0.0
        gY = paramsOrT.ground_y or 0.0
        sY = paramsOrT.start_y or 0.0
        g = paramsOrT.gravity or 9.81
        rest = paramsOrT.restitution or 0.5
        v0 = paramsOrT.start_velocity or 0.0
        sqStr = paramsOrT.squash or paramsOrT.squash_strength or 0.15
        stStr = paramsOrT.stretch or paramsOrT.stretch_strength or 0.02
        flex = paramsOrT.flexibility or 16.0
        damp = paramsOrT.damping or 7.0
    else
        t = paramsOrT or 0.0
        gY = groundY or 0.0
        sY = startY or 0.0
        g = gravity or 9.81
        rest = restitution or 0.5
        v0 = startVelocity or 0.0
        sqStr = squashStrength or 0.15
        stStr = stretchStrength or 0.02
        flex = flexibility or 16.0
        damp = damping or 7.0
    end

    local y, stretchX, stretchY, offsetYRatio, currentVelocity, lastImpactTime, nextImpactTime, impactCount, settled =
        bounce1D(t, gY, sY, g, rest, v0, sqStr, stStr, flex, damp, false)

    local result = {
        pos = y,
        y = y,
        velocity = currentVelocity,
        stretch_x = stretchX,
        stretch_y = stretchY,
        offset_y = offsetYRatio,
        last_impact_time = lastImpactTime,
        next_impact_time = nextImpactTime,
        impact_count = impactCount,
        settled = settled,
        [1] = y,
        [2] = stretchX,
        [3] = stretchY,
        [4] = offsetYRatio,
        [5] = currentVelocity,
    }

    if type(paramsOrT) == "table" then
        return result
    else
        return y, stretchX, stretchY, offsetYRatio, currentVelocity, lastImpactTime, nextImpactTime, impactCount
    end
end

---Closed-form ballistic bounce against a vertical wall plane with integrated,
---continuous Squash & Stretch and wall pinning offset calculation.
---Supports both table configuration and positional arguments.
---@param paramsOrT table|number configuration table or time t
----@param wallX number|nil wall X Canvas coordinate
----@param startX number|nil start X Canvas coordinate
----@param acceleration number|nil acceleration magnitude towards wall
----@param restitution number|nil restitution coefficient in [0, 1)
----@param startVelocity number|nil initial X velocity
----@param squashStrength number|nil impact squash strength coefficient
----@param stretchStrength number|nil in-air velocity stretch coefficient
----@param flexibility number|nil recovery oscillation frequency (rad/s)
----@param damping number|nil recovery damping rate
----@return table|number result object (if table input) or x (if positional input)
function mt.bounce_x(paramsOrT, wallX, startX, acceleration, restitution, startVelocity, squashStrength, stretchStrength, flexibility, damping)
    local t, wX, sX, accel, rest, v0
    local sqStr, stStr, flex, damp

    if type(paramsOrT) == "table" then
        t = paramsOrT.t or 0.0
        wX = paramsOrT.wall_x or paramsOrT.ground_x or 0.0
        sX = paramsOrT.start_x or 0.0
        accel = paramsOrT.acceleration or paramsOrT.accel_x or paramsOrT.gravity or 9.81
        rest = paramsOrT.restitution or 0.5
        v0 = paramsOrT.start_velocity or 0.0
        sqStr = paramsOrT.squash or paramsOrT.squash_strength or 0.15
        stStr = paramsOrT.stretch or paramsOrT.stretch_strength or 0.02
        flex = paramsOrT.flexibility or 16.0
        damp = paramsOrT.damping or 7.0
    else
        t = paramsOrT or 0.0
        wX = wallX or 0.0
        sX = startX or 0.0
        accel = acceleration or 9.81
        rest = restitution or 0.5
        v0 = startVelocity or 0.0
        sqStr = squashStrength or 0.15
        stStr = stretchStrength or 0.02
        flex = flexibility or 16.0
        damp = damping or 7.0
    end

    local x, stretchX, stretchY, offsetXRatio, currentVelocity, lastImpactTime, nextImpactTime, impactCount, settled =
        bounce1D(t, wX, sX, accel, rest, v0, sqStr, stStr, flex, damp, true)

    local result = {
        pos = x,
        x = x,
        velocity = currentVelocity,
        stretch_x = stretchX,
        stretch_y = stretchY,
        offset_x = offsetXRatio,
        last_impact_time = lastImpactTime,
        next_impact_time = nextImpactTime,
        impact_count = impactCount,
        settled = settled,
        [1] = x,
        [2] = stretchX,
        [3] = stretchY,
        [4] = offsetXRatio,
        [5] = currentVelocity,
    }

    if type(paramsOrT) == "table" then
        return result
    else
        return x, stretchX, stretchY, offsetXRatio, currentVelocity, lastImpactTime, nextImpactTime, impactCount
    end
end

---Closed-form squash-and-stretch impulse for a collision event, for impacts the
---script times itself (hitting another character, striking something other than
---the ground). mt.bounce_* already applies this internally.
---Uses a smooth impulse response `sin(omega * dt) * exp(-gamma * dt)`, scaled so
---that `squash` is the peak compression: 0.2 compresses to 80% at its deepest.
---@param params table { t, impact_time, squash?, stiffness?, damping? }
---@return number stretchX
---@return number stretchY
---@return number offsetCorrection ratio of bounds height to keep the item planted
function mt.impact_squash(params)
    assert(type(params) == "table", "impact_squash requires a configuration table")
    local currentTime = params.t or 0.0
    local impactTime = params.impact_time or 0.0
    -- Named to match the squash parameter of mt.bounce_*, and carrying the same
    -- meaning: the peak compression ratio. Impact speed is deliberately not an
    -- input; scale squash yourself to react to speed, so that the compression
    -- stays bounded instead of saturating against the floor below.
    local squashStrength = params.squash or 0.15
    local stiffness = params.stiffness or 25.0
    local damping = params.damping or 12.0

    local elapsed = currentTime - impactTime
    local stretchX = 1.0
    local stretchY = 1.0

    if elapsed >= 0.0 and squashStrength > 0.0 then
        local peakTime = math.atan(stiffness, damping) / stiffness
        local peakEnvelope = math.sin(stiffness * peakTime) * math.exp(-damping * peakTime)
        local normalizeScale = (peakEnvelope > kMinimumImpulseEnvelope) and (1.0 / peakEnvelope) or 1.0
        local impulse = -squashStrength * normalizeScale * math.sin(stiffness * elapsed)
            * math.exp(-damping * elapsed)
        stretchY = math.max(1.0 + impulse, kMinimumImpactStretch)
        stretchX = 1.0 / stretchY
    end

    local offsetCorrection = 0.5 * (stretchY - 1.0)
    return stretchX, stretchY, offsetCorrection
end

---Closed-form 2D ballistic flight: a launch velocity plus constant gravity,
---with no ground plane. This is the "thrown outward" companion to bounce_y /
---bounce_x, for debris, scatter, and toss motions that never land.
---Supports both a configuration table and positional arguments.
---@param paramsOrT table|number configuration table or elapsed time t
---Results are in Y-up canvas coordinates, ready for offset_x / offset_y, while
---the launch angle follows the screen convention used everywhere else in the
---API (0 = right, positive clockwise, so -90 launches upward).
---@param speed number|nil launch speed in canvas units per second
---@param angleDegrees number|nil launch direction, 0 = right, positive clockwise
---@param gravity number|nil downward acceleration in canvas units per second squared
---@param spin number|nil angular velocity in degrees per second
---@param drag number|nil exponential velocity decay rate (0 = vacuum)
---@return table|number result object (if table input) or x (if positional input)
function mt.projectile_2d(paramsOrT, speed, angleDegrees, gravity, spin, drag)
    local t, launchSpeed, launchAngle, gravityValue, spinRate, dragRate
    local originX, originY

    if type(paramsOrT) == "table" then
        t = paramsOrT.t or 0.0
        launchSpeed = paramsOrT.speed or 0.0
        launchAngle = paramsOrT.angle or 0.0
        gravityValue = paramsOrT.gravity or 4.0
        spinRate = paramsOrT.spin or 0.0
        dragRate = paramsOrT.drag or 0.0
        originX = paramsOrT.start_x or 0.0
        originY = paramsOrT.start_y or 0.0
    else
        t = paramsOrT or 0.0
        launchSpeed = speed or 0.0
        launchAngle = angleDegrees or 0.0
        gravityValue = gravity or 4.0
        spinRate = spin or 0.0
        dragRate = drag or 0.0
        originX = 0.0
        originY = 0.0
    end

    local elapsed = math.max(t, 0.0)
    -- polar_offset works in screen orientation (Y grows downward, angles turn
    -- clockwise) so that a launch angle reads the same as every other angle in
    -- the API. Canvas offsets are Y-up, so the vertical component is flipped
    -- here once; gravity can then simply subtract from Y.
    local velocityX, screenVelocityY = mt.polar_offset(launchAngle, launchSpeed)
    local velocityY = -screenVelocityY

    -- Without drag this is the plain ballistic solution. With drag the velocity
    -- decays exponentially, so displacement uses its integral (1 - e^-kt) / k.
    local travelX, travelY
    local currentVelocityX, currentVelocityY
    if dragRate > kMinimumDragRate then
        local decay = math.exp(-dragRate * elapsed)
        local integral = (1.0 - decay) / dragRate
        travelX = velocityX * integral
        -- Gravity keeps accelerating while drag resists it, so the vertical term
        -- combines the decaying launch impulse with the drag-limited fall.
        travelY = velocityY * integral - gravityValue * (elapsed - integral) / dragRate
        currentVelocityX = velocityX * decay
        currentVelocityY = velocityY * decay - gravityValue * integral
    else
        -- Below the cutoff, (elapsed - integral) / dragRate loses all precision to
        -- cancellation, so fall back to the drag-free solution it converges to.
        travelX = velocityX * elapsed
        travelY = velocityY * elapsed - 0.5 * gravityValue * elapsed * elapsed
        currentVelocityX = velocityX
        currentVelocityY = velocityY - gravityValue * elapsed
    end

    local x = originX + travelX
    local y = originY + travelY
    local rotation = spinRate * elapsed

    if type(paramsOrT) == "table" then
        return {
            x = x,
            y = y,
            rotation = rotation,
            velocity_x = currentVelocityX,
            velocity_y = currentVelocityY,
            [1] = x,
            [2] = y,
            [3] = rotation,
            [4] = currentVelocityX,
            [5] = currentVelocityY,
        }
    end
    return x, y, rotation, currentVelocityX, currentVelocityY
end

---Closed-form exponential deceleration: something launched at `speed` that
---coasts to a stop under friction. Unlike an easing curve this is driven by
---physical quantities, so the launch speed and the drag rate stay independent.
---@param t number elapsed time in seconds
---@param speed number initial speed in canvas units per second
---@param friction number decay rate; larger stops sooner
---@return number distance travelled so far
---@return number currentSpeed remaining speed at t
function mt.friction_decay(t, speed, friction)
    local elapsed = math.max(t, 0.0)
    local decayRate = friction or 0.0
    local distance
    local currentSpeed
    if decayRate > kMinimumDragRate then
        local decay = math.exp(-decayRate * elapsed)
        -- Total coast distance is speed / friction; the term below approaches it.
        distance = speed * (1.0 - decay) / decayRate
        currentSpeed = speed * decay
    else
        distance = speed * elapsed
        currentSpeed = speed
    end
    return distance, currentSpeed
end

---------------------------------------------------------------------------
-- Layout and text processing helpers
---------------------------------------------------------------------------

local function layoutMatrixMultiply(left, right)
    return {
        a = left.a * right.a + left.c * right.b,
        b = left.b * right.a + left.d * right.b,
        c = left.a * right.c + left.c * right.d,
        d = left.b * right.c + left.d * right.d,
        tx = left.a * right.tx + left.c * right.ty + left.tx,
        ty = left.b * right.tx + left.d * right.ty + left.ty,
    }
end

local function layoutTranslation(x, y)
    return { a = 1.0, b = 0.0, c = 0.0, d = 1.0, tx = x, ty = y }
end

local function layoutRotation(degrees)
    local radians = degrees * (math.pi / 180.0)
    local cosine = math.cos(radians)
    local sine = math.sin(radians)
    return { a = cosine, b = sine, c = -sine, d = cosine, tx = 0.0, ty = 0.0 }
end

local function layoutScaling(x, y)
    return { a = x, b = 0.0, c = 0.0, d = y, tx = 0.0, ty = 0.0 }
end

local function layoutMapPoint(matrix, x, y)
    return matrix.a * x + matrix.c * y + matrix.tx,
        matrix.b * x + matrix.d * y + matrix.ty
end

local function layoutInverseMapVector(matrix, x, y)
    local determinant = matrix.a * matrix.d - matrix.b * matrix.c
    assert(math.abs(determinant) > 0.000000000001,
        "2D layout transform is singular; scale and stretch products must be non-zero")
    return (matrix.d * x - matrix.c * y) / determinant,
        (-matrix.b * x + matrix.a * y) / determinant
end

local function layoutNormalizedPoint(ctx, x, y)
    return (x - 0.5) * ctx.canvas.width,
        -(y - 0.5) * ctx.canvas.height
end

local function layoutGlobalMatrix(ctx)
    local global = ctx.global
    local canvasWidth = ctx.canvas.width
    local canvasHeight = ctx.canvas.height
    local positionX = global.position_x * canvasWidth
    local positionY = (1.0 - global.position_y) * canvasHeight
    local pivotX = (global.pivot_x - 0.5) * canvasWidth
    local pivotY = -(global.pivot_y - 0.5) * canvasHeight
    local matrix = layoutTranslation(positionX, positionY)
    matrix = layoutMatrixMultiply(matrix, layoutTranslation(pivotX, pivotY))
    matrix = layoutMatrixMultiply(matrix, layoutRotation(global.rotation))
    matrix = layoutMatrixMultiply(matrix,
        layoutScaling(global.scale * global.stretch_x, global.scale * global.stretch_y))
    return layoutMatrixMultiply(matrix, layoutTranslation(-pivotX, -pivotY))
end

local function layoutCharacterMatrix(ctx, character)
    local geometry = character.geometry
    local centerX, centerY =
        layoutNormalizedPoint(ctx, geometry.bounds_center_x, geometry.bounds_center_y)
    local offsetX = (character.offset_x - 0.5) * ctx.canvas.width
    local offsetY = -(character.offset_y - 0.5) * ctx.canvas.height
    local pivotX = (character.pivot_x - 0.5) * ctx.canvas.width
    local pivotY = -(character.pivot_y - 0.5) * ctx.canvas.height
    local matrix = layoutTranslation(offsetX, offsetY)
    matrix = layoutMatrixMultiply(matrix, layoutTranslation(centerX + pivotX, centerY + pivotY))
    matrix = layoutMatrixMultiply(matrix, layoutRotation(character.rotation))
    matrix = layoutMatrixMultiply(matrix,
        layoutScaling(character.scale * character.stretch_x, character.scale * character.stretch_y))
    return layoutMatrixMultiply(matrix, layoutTranslation(-centerX - pivotX, -centerY - pivotY))
end

local function layoutPartMatrix(ctx, part)
    local pivotX = (part.pivot_x - 0.5) * ctx.canvas.width
    local pivotY = -(part.pivot_y - 0.5) * ctx.canvas.height
    local offsetX = (part.offset_x - 0.5) * ctx.canvas.width
    local offsetY = -(part.offset_y - 0.5) * ctx.canvas.height
    local matrix = layoutTranslation(offsetX, offsetY)
    matrix = layoutMatrixMultiply(matrix, layoutTranslation(pivotX, pivotY))
    matrix = layoutMatrixMultiply(matrix, layoutRotation(part.rotation))
    matrix = layoutMatrixMultiply(matrix,
        layoutScaling(part.scale * part.stretch_x, part.scale * part.stretch_y))
    return layoutMatrixMultiply(matrix, layoutTranslation(-pivotX, -pivotY))
end

local function layoutFullCharacterMatrix(ctx, character)
    return layoutMatrixMultiply(layoutGlobalMatrix(ctx), layoutCharacterMatrix(ctx, character))
end

local function layoutFullPartMatrix(ctx, part)
    local character = ctx.chars[part.character_index]
    assert(character ~= nil, "part.character_index does not identify an active character")
    local naturalX, naturalY =
        layoutNormalizedPoint(ctx, part.geometry.canvas_center_x, part.geometry.canvas_center_y)
    local matrix = layoutMatrixMultiply(layoutGlobalMatrix(ctx), layoutCharacterMatrix(ctx, character))
    matrix = layoutMatrixMultiply(matrix, layoutTranslation(naturalX, naturalY))
    return layoutMatrixMultiply(matrix, layoutPartMatrix(ctx, part))
end

local function layoutSetCharacterPoint(ctx, character, naturalX, naturalY, targetX, targetY)
    local pointX, pointY = layoutNormalizedPoint(ctx, naturalX, naturalY)
    local targetPixelX, targetPixelY = layoutNormalizedPoint(ctx, targetX, targetY)
    local currentX, currentY = layoutMapPoint(layoutCharacterMatrix(ctx, character), pointX, pointY)
    character.offset_x = character.offset_x + (targetPixelX - currentX) / ctx.canvas.width
    character.offset_y = character.offset_y - (targetPixelY - currentY) / ctx.canvas.height
end

local function layoutCharacterOrigin(character, writingMode)
    local geometry = character.geometry
    local x, y
    if writingMode == "vertical" then
        x = geometry.vertical_origin_x
        y = geometry.vertical_origin_y
    else
        x = geometry.canvas_origin_x
        y = geometry.canvas_origin_y
    end
    return x, y
end

local function layoutReflowRange(ctx, firstIndex, lastIndex, anchorIndex, gap, writingMode, selected)
    local anchor = ctx.chars[anchorIndex]
    local anchorOriginX, anchorOriginY = layoutCharacterOrigin(anchor, writingMode)
    local anchorPointX, anchorPointY = layoutNormalizedPoint(ctx, anchorOriginX, anchorOriginY)
    local anchorPenPixelX, anchorPenPixelY =
        layoutMapPoint(layoutCharacterMatrix(ctx, anchor), anchorPointX, anchorPointY)
    local anchorPenX = 0.5 + anchorPenPixelX / ctx.canvas.width
    local anchorPenY = 0.5 - anchorPenPixelY / ctx.canvas.height

    local penX = anchorPenX
    local penY = anchorPenY
    for index = anchorIndex + 1, lastIndex do
        local previous = ctx.chars[index - 1]
        local current = ctx.chars[index]
        local previousOriginX, previousOriginY = layoutCharacterOrigin(previous, writingMode)
        local currentOriginX, currentOriginY = layoutCharacterOrigin(current, writingMode)
        if writingMode == "vertical" then
            local naturalStep = currentOriginY - previousOriginY
            local shapedSpacing = naturalStep - previous.geometry.advance_y
            penY = penY
                + previous.scale * previous.stretch_y * previous.geometry.advance_y
                + shapedSpacing - gap
        else
            local naturalStep = currentOriginX - previousOriginX
            local shapedSpacing = naturalStep - previous.geometry.advance_x
            penX = penX
                + previous.scale * previous.stretch_x * previous.geometry.advance_x
                + shapedSpacing + gap
        end
        if selected == nil or selected[index] then
            layoutSetCharacterPoint(ctx, current, currentOriginX, currentOriginY, penX, penY)
        end
    end

    penX = anchorPenX
    penY = anchorPenY
    for index = anchorIndex - 1, firstIndex, -1 do
        local current = ctx.chars[index]
        local nextCharacter = ctx.chars[index + 1]
        local currentOriginX, currentOriginY = layoutCharacterOrigin(current, writingMode)
        local nextOriginX, nextOriginY = layoutCharacterOrigin(nextCharacter, writingMode)
        if writingMode == "vertical" then
            local naturalStep = nextOriginY - currentOriginY
            local shapedSpacing = naturalStep - current.geometry.advance_y
            penY = penY
                - current.scale * current.stretch_y * current.geometry.advance_y
                - shapedSpacing + gap
        else
            local naturalStep = nextOriginX - currentOriginX
            local shapedSpacing = naturalStep - current.geometry.advance_x
            penX = penX
                - current.scale * current.stretch_x * current.geometry.advance_x
                - shapedSpacing - gap
        end
        if selected == nil or selected[index] then
            layoutSetCharacterPoint(ctx, current, currentOriginX, currentOriginY, penX, penY)
        end
    end
end

---Reflows characters from exact shaped horizontal/vertical origins.
---Targets must be strictly increasing and contained in one shaped line.
---Non-target characters between targets contribute their scaled advances but
---are not moved.
---@param ctx table
---@param gap number|nil additional canvas-width/height-normalized advance gap
---@param config table|nil { targets?, anchor?, mode? }
function mt.layout.reflow(ctx, gap, config)
    assert(ctx and ctx.chars and ctx.char_count, "reflow requires an OnLayout context")
    if ctx.char_count <= 0 then
        return
    end

    local currentConfig = config or {}
    local writingMode = currentConfig.mode or (ctx.global.vertical and "vertical" or "horizontal")
    assert(writingMode == "horizontal" or writingMode == "vertical",
        "reflow config.mode must be 'horizontal' or 'vertical'")
    local extraGap = gap or 0.0
    local targets = currentConfig.targets

    if targets and #targets > 0 then
        local firstIndex = targets[1]
        local lastIndex = targets[#targets]
        assert(firstIndex >= 1 and lastIndex <= ctx.char_count, "reflow target index is out of range")
        local lineIndex = ctx.chars[firstIndex].line_index
        local selected = {}
        local previousTargetIndex = 0
        for _, targetIndex in ipairs(targets) do
            assert(targetIndex >= 1 and targetIndex <= ctx.char_count,
                "reflow target index is out of range")
            assert(targetIndex > previousTargetIndex,
                "reflow targets must be strictly increasing without duplicates")
            assert(ctx.chars[targetIndex].line_index == lineIndex,
                "reflow targets must belong to one shaped line")
            selected[targetIndex] = true
            previousTargetIndex = targetIndex
        end
        local anchorIndex = currentConfig.anchor or firstIndex
        assert(selected[anchorIndex], "reflow anchor must be one of targets")
        layoutReflowRange(ctx, firstIndex, lastIndex, anchorIndex, extraGap, writingMode, selected)
    else
        if currentConfig.anchor ~= nil then
            assert(currentConfig.anchor >= 1 and currentConfig.anchor <= ctx.char_count,
                "reflow anchor index is out of range")
        end
        local firstIndex = 1
        while firstIndex <= ctx.char_count do
            local lineIndex = ctx.chars[firstIndex].line_index
            local lastIndex = firstIndex
            while lastIndex < ctx.char_count
                and ctx.chars[lastIndex + 1].line_index == lineIndex do
                lastIndex = lastIndex + 1
            end
            local anchorIndex = firstIndex
            if currentConfig.anchor ~= nil
                and currentConfig.anchor >= firstIndex
                and currentConfig.anchor <= lastIndex then
                anchorIndex = currentConfig.anchor
            end
            layoutReflowRange(ctx, firstIndex, lastIndex, anchorIndex, extraGap, writingMode, nil)
            firstIndex = lastIndex + 1
        end
    end
end

---Calculates the exact current pre-3D canvas position (canvasX, canvasY)
---of a character or part anchor. All global/character/part 2D offset, pivot,
---rotation, scale, and stretch transforms are included.
---The position is in normalized Y-up canvas coordinates (0.0 to 1.0).
---@param ctx table
---@param item table character or part
---@return number canvasX
---@return number canvasY
function mt.layout.get_canvas_position_2d(ctx, item)
    assert(ctx and ctx.canvas and ctx.global, "get_canvas_position_2d requires an OnLayout context")
    assert(item and item.geometry, "get_canvas_position_2d requires a character or part")
    local currentPixelX, currentPixelY

    if item.character_index ~= nil then
        currentPixelX, currentPixelY = layoutMapPoint(layoutFullPartMatrix(ctx, item), 0.0, 0.0)
    else
        local naturalX, naturalY =
            layoutNormalizedPoint(ctx, item.geometry.bounds_center_x, item.geometry.bounds_center_y)
        currentPixelX, currentPixelY =
            layoutMapPoint(layoutFullCharacterMatrix(ctx, item), naturalX, naturalY)
    end

    local canvasX = currentPixelX / ctx.canvas.width
    local canvasY = 1.0 - (currentPixelY / ctx.canvas.height)
    return canvasX, canvasY
end

---Distance from a canvas point to the centre of a radial effect, corrected for
---the canvas aspect ratio so that a fixed distance describes a circle rather
---than an ellipse on a non-square canvas. Skipping that correction is the usual
---cause of ripples and shockwaves looking stretched on wide comps.
---@param ctx table
---@param canvasX number
---@param canvasY number
---@param centerX number|nil centre X, defaults to the canvas centre (0.5)
---@param centerY number|nil centre Y, defaults to the canvas centre (0.5)
---@return number distance in aspect-corrected canvas units
function mt.layout.radial_distance(ctx, canvasX, canvasY, centerX, centerY)
    assert(ctx and ctx.canvas, "radial_distance requires a context with canvas metrics")
    local originX = centerX or 0.5
    local originY = centerY or 0.5
    local deltaX = (canvasX - originX) * ctx.canvas.aspect_ratio
    local deltaY = canvasY - originY
    return math.sqrt(deltaX * deltaX + deltaY * deltaY)
end

---Calculates the relative offset_x and offset_y required to place a character
---or part anchor at an exact pre-3D canvas position (canvasX, canvasY).
---Does not mutate item properties.
---@param ctx table
---@param item table character or part
---@param canvasX number
---@param canvasY number
---@return number calcOffsetX
---@return number calcOffsetY
function mt.layout.canvas_to_offset_2d(ctx, item, canvasX, canvasY)
    assert(ctx and ctx.canvas and ctx.global, "canvas_to_offset_2d requires an OnLayout context")
    assert(item and item.geometry, "canvas_to_offset_2d requires a character or part")
    local targetPixelX = canvasX * ctx.canvas.width
    local targetPixelY = (1.0 - canvasY) * ctx.canvas.height
    local currentPixelX, currentPixelY
    local parentMatrix

    if item.character_index ~= nil then
        local character = ctx.chars[item.character_index]
        assert(character ~= nil, "part.character_index does not identify an active character")
        currentPixelX, currentPixelY = layoutMapPoint(layoutFullPartMatrix(ctx, item), 0.0, 0.0)
        parentMatrix = layoutMatrixMultiply(layoutGlobalMatrix(ctx), layoutCharacterMatrix(ctx, character))
    else
        local naturalX, naturalY =
            layoutNormalizedPoint(ctx, item.geometry.bounds_center_x, item.geometry.bounds_center_y)
        currentPixelX, currentPixelY =
            layoutMapPoint(layoutFullCharacterMatrix(ctx, item), naturalX, naturalY)
        parentMatrix = layoutGlobalMatrix(ctx)
    end

    local correctionX, correctionY = layoutInverseMapVector(
        parentMatrix, targetPixelX - currentPixelX, targetPixelY - currentPixelY)
    local calcOffsetX = item.offset_x + correctionX / ctx.canvas.width
    local calcOffsetY = item.offset_y - correctionY / ctx.canvas.height
    return calcOffsetX, calcOffsetY
end

---Places a character or part anchor at an exact pre-3D canvas position.
---All global/character/part 2D offset, pivot, rotation, scale, and stretch
---transforms are included. The anchor is the character natural ink-bounds
---center or the part's local natural center.
---@param ctx table
---@param item table
---@param canvasX number
---@param canvasY number
---@return number offsetX
---@return number offsetY
function mt.layout.place_2d(ctx, item, canvasX, canvasY)
    local offsetX, offsetY = mt.layout.canvas_to_offset_2d(ctx, item, canvasX, canvasY)
    item.offset_x = offsetX
    item.offset_y = offsetY
    return offsetX, offsetY
end

local function layoutExtendBounds(bounds, matrix, centerX, centerY, width, height)
    local halfWidth = width * 0.5
    local halfHeight = height * 0.5
    local corners = {
        { centerX - halfWidth, centerY - halfHeight },
        { centerX + halfWidth, centerY - halfHeight },
        { centerX + halfWidth, centerY + halfHeight },
        { centerX - halfWidth, centerY + halfHeight },
    }
    for _, corner in ipairs(corners) do
        local x, y = layoutMapPoint(matrix, corner[1], corner[2])
        bounds.left = math.min(bounds.left, x)
        bounds.right = math.max(bounds.right, x)
        bounds.top = math.min(bounds.top, y)
        bounds.bottom = math.max(bounds.bottom, y)
        bounds.count = bounds.count + 1
    end
end

---Measures one item's transformed ink bounds through the complete 2D hierarchy,
---returning canvas-normalized Y-up half extents around its anchor. Rotation and
---stretch in any ancestor are included, so the returned distances describe the
---axis-aligned box actually seen on canvas rather than the natural box.
---@param ctx table
---@param item table character or part
---@return number halfWidth
---@return number halfHeight
local function layoutItemCanvasHalfExtents(ctx, item)
    local bounds = {
        left = math.huge,
        right = -math.huge,
        top = math.huge,
        bottom = -math.huge,
        count = 0,
    }

    if item.character_index ~= nil then
        local width = item.geometry.bounds_width * ctx.canvas.width
        local height = item.geometry.bounds_height * ctx.canvas.height
        local centerX = (item.geometry.bounds_center_x - item.geometry.canvas_center_x) * ctx.canvas.width
        local centerY = -(item.geometry.bounds_center_y - item.geometry.canvas_center_y) * ctx.canvas.height
        layoutExtendBounds(bounds, layoutFullPartMatrix(ctx, item), centerX, centerY, width, height)
    else
        local centerX, centerY =
            layoutNormalizedPoint(ctx, item.geometry.bounds_center_x, item.geometry.bounds_center_y)
        local width = item.geometry.bounds_width * ctx.canvas.width
        local height = item.geometry.bounds_height * ctx.canvas.height
        layoutExtendBounds(bounds, layoutFullCharacterMatrix(ctx, item), centerX, centerY, width, height)
    end

    local halfWidth = 0.5 * (bounds.right - bounds.left) / ctx.canvas.width
    local halfHeight = 0.5 * (bounds.bottom - bounds.top) / ctx.canvas.height
    return halfWidth, halfHeight
end

---Convenience API: Bounces a character or part item against a ground Canvas plane,
---automatically computing and applying offset_y, stretch_x, and stretch_y.
---@param ctx table OnLayout context
---@param item table character (ctx.chars[i]) or part (ctx.parts[j])
---@param groundY number Canvas Y coordinate of ground plane (e.g. 0.1)
---@param config table|nil optional settings { t?, start_y?, drop_height?, start_mode?, ground_mode?, delay?, gravity?, restitution?, squash?, stretch?, flexibility?, damping?, align_to? }
---@return table result bounce object
function mt.bounce_ground(ctx, item, groundY, config)
    assert(ctx and ctx.canvas and ctx.global, "bounce_ground requires an OnLayout context")
    assert(item and item.geometry, "bounce_ground requires a character or part")
    local cfg = config or {}
    local delay = cfg.delay or 0.0
    local currentTime = cfg.t or ctx.time or 0.0
    local elapsed = math.max(currentTime - delay, 0.0)

    local curX, curY = mt.layout.get_canvas_position_2d(ctx, item)

    -- Resolve the drop origin. "absolute" drops every item from one shared
    -- canvas height (start_y); "relative" lifts each item by drop_height above
    -- its own laid-out position. Passing start_y without start_mode selects
    -- "absolute" so pre-existing scripts keep their behaviour.
    local startMode = cfg.start_mode or (cfg.start_y and "absolute" or "relative")
    assert(startMode == "absolute" or startMode == "relative",
        "bounce_ground: start_mode must be \"absolute\" or \"relative\"")

    -- Resolve the landing basis. "absolute" treats groundY as a fixed canvas
    -- line unaffected by global/character rotation and scale; "relative" keeps
    -- the legacy behaviour where the landing follows the ancestor transforms.
    local groundMode = cfg.ground_mode or startMode
    assert(groundMode == "absolute" or groundMode == "relative",
        "bounce_ground: ground_mode must be \"absolute\" or \"relative\"")

    local dropHeight = cfg.drop_height or kDefaultBounceTravelDistance
    local startY = curY + dropHeight
    if startMode == "absolute" and cfg.start_y then
        startY = cfg.start_y
    end

    local b = mt.bounce_y({
        t = elapsed,
        ground_y = groundY,
        start_y = startY,
        gravity = cfg.gravity or 4.0,
        restitution = cfg.restitution or 0.45,
        start_velocity = cfg.start_velocity or 0.0,
        squash = cfg.squash or 0.15,
        stretch = cfg.stretch or 0.02,
        flexibility = cfg.flexibility or 16.0,
        damping = cfg.damping or 7.0,
    })

    -- Calculate ground pinning and alignment offset.
    -- align_to modes:
    --   "bottom" / "bounds_bottom": aligns character/part lower bounding-box edge directly on groundY (physical floor collision)
    --   "baseline": aligns character baseline / origin on groundY (typesetting alignment)
    --   "center": aligns bounding-box center on groundY
    local alignMode = cfg.align_to or "bottom"

    -- In absolute mode the contact edge must be measured on canvas, so the
    -- half height comes from the transformed bounds. Relative mode keeps using
    -- the natural box so that its landing tracks the ancestor transforms.
    local halfHeight = 0.5 * (item.geometry.bounds_height or 0.1)
    if groundMode == "absolute" then
        local _, transformedHalfHeight = layoutItemCanvasHalfExtents(ctx, item)
        halfHeight = transformedHalfHeight
    end

    local anchorOffsetY = halfHeight
    if alignMode == "baseline" then
        if item.geometry.canvas_origin_y ~= nil then
            anchorOffsetY = item.geometry.bounds_center_y - item.geometry.canvas_origin_y
        end
    elseif alignMode == "center" then
        anchorOffsetY = 0.0
    end

    local targetCenterY = b.y + anchorOffsetY + b.offset_y * (item.geometry.bounds_height or 0.1)
    local calcOffsetX, calcOffsetY = mt.layout.canvas_to_offset_2d(ctx, item, curX, targetCenterY)
    item.offset_y = calcOffsetY

    -- canvas_to_offset_2d returns an offset pair that must be applied together:
    -- once an ancestor rotation couples the axes, writing only offset_y misses
    -- the requested canvas point. Absolute mode therefore commits both, which
    -- also holds the item on its current canvas column while it falls.
    if groundMode == "absolute" then
        item.offset_x = calcOffsetX
    end

    item.stretch_x = b.stretch_x
    item.stretch_y = b.stretch_y

    return b
end

---Convenience API: Bounces a character or part item against a vertical wall Canvas plane,
---automatically computing and applying offset_x, stretch_x, and stretch_y.
---@param ctx table OnLayout context
---@param item table character (ctx.chars[i]) or part (ctx.parts[j])
---@param wallX number Canvas X coordinate of wall plane (e.g. 0.9)
---@param config table|nil optional settings { t?, start_x?, travel_distance?, start_mode?, wall_mode?, delay?, accel?, restitution?, squash?, stretch?, flexibility?, damping?, align_to? }
---@return table result bounce object
function mt.bounce_wall(ctx, item, wallX, config)
    assert(ctx and ctx.canvas and ctx.global, "bounce_wall requires an OnLayout context")
    assert(item and item.geometry, "bounce_wall requires a character or part")
    local cfg = config or {}
    local delay = cfg.delay or 0.0
    local currentTime = cfg.t or ctx.time or 0.0
    local elapsed = math.max(currentTime - delay, 0.0)

    local curX, curY = mt.layout.get_canvas_position_2d(ctx, item)

    -- Resolve the launch origin. "absolute" starts every item from one shared
    -- canvas column (start_x); "relative" pulls each item back by
    -- travel_distance from its own laid-out position, away from the wall.
    -- Passing start_x without start_mode selects "absolute" so pre-existing
    -- scripts keep their behaviour.
    local startMode = cfg.start_mode or (cfg.start_x and "absolute" or "relative")
    assert(startMode == "absolute" or startMode == "relative",
        "bounce_wall: start_mode must be \"absolute\" or \"relative\"")

    -- Resolve the impact basis. "absolute" treats wallX as a fixed canvas
    -- column unaffected by global/character rotation and scale; "relative"
    -- keeps the legacy behaviour of following the ancestor transforms.
    local wallMode = cfg.wall_mode or startMode
    assert(wallMode == "absolute" or wallMode == "relative",
        "bounce_wall: wall_mode must be \"absolute\" or \"relative\"")

    local travelDistance = cfg.travel_distance or kDefaultBounceTravelDistance
    local approachesFromLeft = curX <= wallX
    local startX = approachesFromLeft and (curX - travelDistance) or (curX + travelDistance)
    if startMode == "absolute" and cfg.start_x then
        startX = cfg.start_x
        approachesFromLeft = startX <= wallX
    end

    local b = mt.bounce_x({
        t = elapsed,
        wall_x = wallX,
        start_x = startX,
        acceleration = cfg.accel or cfg.acceleration or 4.0,
        restitution = cfg.restitution or 0.45,
        start_velocity = cfg.start_velocity or 0.0,
        squash = cfg.squash or 0.15,
        stretch = cfg.stretch or 0.02,
        flexibility = cfg.flexibility or 16.0,
        damping = cfg.damping or 7.0,
    })

    -- Calculate wall pinning and alignment offset.
    -- align_to modes:
    --   "right" / "bounds_right" (default when starting from left): aligns right bounding-box edge on wallX
    --   "left" / "bounds_left": aligns left bounding-box edge on wallX
    --   "center": aligns center on wallX
    local alignMode = cfg.align_to or (approachesFromLeft and "right" or "left")

    -- In absolute mode the contact edge must be measured on canvas, so the
    -- half width comes from the transformed bounds. Relative mode keeps using
    -- the natural box so that its impact tracks the ancestor transforms.
    local halfWidth = 0.5 * (item.geometry.bounds_width or 0.1)
    if wallMode == "absolute" then
        local transformedHalfWidth = layoutItemCanvasHalfExtents(ctx, item)
        halfWidth = transformedHalfWidth
    end

    local anchorOffsetX = 0.0
    if alignMode == "right" or alignMode == "bounds_right" then
        anchorOffsetX = -halfWidth
    elseif alignMode == "left" or alignMode == "bounds_left" then
        anchorOffsetX = halfWidth
    end

    local targetCenterX = b.x + anchorOffsetX + b.offset_x * (item.geometry.bounds_width or 0.1)
    local calcOffsetX, calcOffsetY = mt.layout.canvas_to_offset_2d(ctx, item, targetCenterX, curY)
    item.offset_x = calcOffsetX

    -- canvas_to_offset_2d returns an offset pair that must be applied together:
    -- once an ancestor rotation couples the axes, writing only offset_x misses
    -- the requested canvas point. Absolute mode therefore commits both, which
    -- also holds the item on its current canvas row while it travels.
    if wallMode == "absolute" then
        item.offset_y = calcOffsetY
    end

    item.stretch_x = b.stretch_x
    item.stretch_y = b.stretch_y

    return b
end

---Measures transformed natural part boxes through the complete 2D hierarchy.
---The result is in canvas-normalized Y-up coordinates before 3D, projection,
---and deformation. Stroke and shadow extents are not geometry bounds.
---@param ctx table
---@param targets table array of 1-based character or part indices
---@param targetType string|nil "character" (default) or "part"
---@return table|nil bounds
function mt.layout.measure_bounds_2d(ctx, targets, targetType)
    assert(ctx and ctx.canvas and ctx.global, "measure_bounds_2d requires an OnLayout context")
    assert(type(targets) == "table", "measure_bounds_2d targets must be a table")
    local currentTargetType = targetType or "character"
    assert(currentTargetType == "character" or currentTargetType == "part",
        "measure_bounds_2d targetType must be 'character' or 'part'")
    local selected = {}
    for _, targetIndex in ipairs(targets) do
        selected[targetIndex] = true
    end

    local bounds = {
        left = math.huge,
        right = -math.huge,
        top = math.huge,
        bottom = -math.huge,
        count = 0,
    }
    local charactersWithParts = {}
    for partIndex = 1, ctx.part_count do
        local part = ctx.parts[partIndex]
        local selectedPart = currentTargetType == "part" and selected[partIndex]
        local selectedCharacter = currentTargetType == "character" and selected[part.character_index]
        if selectedPart or selectedCharacter then
            local width = part.geometry.bounds_width * ctx.canvas.width
            local height = part.geometry.bounds_height * ctx.canvas.height
            local centerX =
                (part.geometry.bounds_center_x - part.geometry.canvas_center_x) * ctx.canvas.width
            local centerY =
                -(part.geometry.bounds_center_y - part.geometry.canvas_center_y) * ctx.canvas.height
            layoutExtendBounds(
                bounds, layoutFullPartMatrix(ctx, part), centerX, centerY, width, height)
            charactersWithParts[part.character_index] = true
        end
    end

    if currentTargetType == "character" then
        for characterIndex = 1, ctx.char_count do
            if selected[characterIndex] and not charactersWithParts[characterIndex] then
                local character = ctx.chars[characterIndex]
                local centerX, centerY = layoutNormalizedPoint(
                    ctx, character.geometry.bounds_center_x, character.geometry.bounds_center_y)
                local width = character.geometry.bounds_width * ctx.canvas.width
                local height = character.geometry.bounds_height * ctx.canvas.height
                layoutExtendBounds(
                    bounds, layoutFullCharacterMatrix(ctx, character), centerX, centerY, width, height)
            end
        end
    end

    local result = nil
    if bounds.count > 0 then
        local left = bounds.left / ctx.canvas.width
        local right = bounds.right / ctx.canvas.width
        local top = 1.0 - bounds.top / ctx.canvas.height
        local bottom = 1.0 - bounds.bottom / ctx.canvas.height
        result = {
            left = left,
            right = right,
            bottom = bottom,
            top = top,
            center_x = (left + right) * 0.5,
            center_y = (bottom + top) * 0.5,
            width = right - left,
            height = top - bottom,
        }
    end
    return result
end

---Converts a CANVAS target (0.5 = canvas center, Y-up, same
---convention as ctx.global.position_x/y) into the offset_x/offset_y
---displacement that places a natural center at that position after the 2D
---global position/rotation/scale/stretch/pivot. It does not invert item,
---hierarchy, 3D, camera, projection, or deformation transforms. Without
---this, assigning canvas coordinates straight to offset_x/offset_y only
---produces the intended screen position when ctx.global is left at its
---identity values (position 0.5,0.5, rotation 0, scale/stretch 1, pivot
---0.5,0.5) -- any global transform then also moves/rotates/scales wherever
---the offset placed the character, same as it would for the rest of the
---text.
---
---The math runs in PIXELS (matching the host's TransformHelper::getGlobalMatrix,
---src/TransformHelper.cc), not in canvas-normalized units directly: with a
---non-square canvas, doing this rotation/scale math directly in normalized
---(0..1) fractions distorts angles and distances differently on X and Y,
---giving wrong results. canvas.width/height convert to and from pixels.
---@param resolvedGlobal table ctx.global, already confirmed by OnPreLayout
---@param canvasWidth number ctx.canvas.width
---@param canvasHeight number ctx.canvas.height
---@param naturalCenterX number the target's own natural center, canvas-normalized (character/part geometry.bounds_center_x, or geometry.canvas_center_x for a part)
---@param naturalCenterY number see naturalCenterX
---@param canvasX number desired 2D canvas position, canvas-normalized (0.5 = canvas center)
---@param canvasY number see canvasX
---@return number offsetX
---@return number offsetY
---@deprecated Use mt.layout.place_2d.
function mt.layout.canvas_to_offset(resolvedGlobal, canvasWidth, canvasHeight, naturalCenterX, naturalCenterY, canvasX, canvasY)
    -- Forward transform being inverted here (getGlobalMatrix's point flow,
    -- applied to a point p in the character's own local space -- pixels,
    -- Y-down, CANVAS-CENTER origin, matching natural.centerX/Y):
    --   screen = T(position) . T(pivot) . Rotate(rotation) . Scale(stretch * scale) . T(-pivot) . p
    -- (all in top-left-origin pixels except p itself). The inverse undoes
    -- these left-to-right (outermost first):
    --   p = T(pivot) . Scale(1/scale) . Rotate(-rotation) . T(-pivot) . T(-position) . screen
    --
    -- Undoing T(position) alone (screen - position, both top-left-origin)
    -- already lands back in canvas-CENTER-origin pixels: position_x/y = 0.5
    -- maps to canvasWidth/2, canvasHeight/2, i.e. exactly the top-left pixel
    -- coordinate of the canvas center, so subtracting it re-centers the
    -- result at the canvas center. Every following step therefore works in
    -- this same center-origin pixel space, matching pivot/rotate/scale's own
    -- inputs, until the final conversion back to canvas-normalized, Y-up.
    local pivotX = (resolvedGlobal.pivot_x - 0.5) * canvasWidth
    local pivotY = -(resolvedGlobal.pivot_y - 0.5) * canvasHeight
    local positionX = resolvedGlobal.position_x * canvasWidth
    local positionY = (1.0 - resolvedGlobal.position_y) * canvasHeight

    -- canvasX/canvasY are canvas-normalized, Y-up (0.5 = center); convert to
    -- top-left-origin pixels, Y-down (the space position/pivot above use).
    local screenPxX = canvasX * canvasWidth
    local screenPxY = (1.0 - canvasY) * canvasHeight

    -- Undo T(position) -- result is canvas-CENTER-origin pixels, Y-down.
    local afterPosition = { x = screenPxX - positionX, y = screenPxY - positionY }

    -- Undo T(pivot).
    local afterPivot = { x = afterPosition.x - pivotX, y = afterPosition.y - pivotY }

    -- Undo Rotate(rotation). rotation is in degrees, positive = clockwise on
    -- screen (section 7.2); undoing a clockwise rotation by `rotation`
    -- degrees is a rotation by `-rotation` in the same (Y-down pixel,
    -- clockwise-positive) convention, which is what this matrix applies.
    local rotationRadians = resolvedGlobal.rotation * (math.pi / 180.0)
    local cosine = math.cos(rotationRadians)
    local sine = math.sin(rotationRadians)
    local afterRotation = {
        x = afterPivot.x * cosine + afterPivot.y * sine,
        y = -afterPivot.x * sine + afterPivot.y * cosine,
    }

    -- Undo Scale(stretch * scale).
    local scaleX = resolvedGlobal.stretch_x * resolvedGlobal.scale
    local scaleY = resolvedGlobal.stretch_y * resolvedGlobal.scale
    local afterScale = { x = afterRotation.x / scaleX, y = afterRotation.y / scaleY }

    -- Redo T(pivot) -- this is now the target position in canvas-CENTER-origin
    -- pixels, Y-down, the same space natural.centerX/Y (and thus
    -- geometry.bounds_center_x/y before normalization) occupy.
    local localCenterPxX = afterScale.x + pivotX
    local localCenterPxY = afterScale.y + pivotY

    -- Convert from canvas-center-origin pixels, Y-down, to canvas-normalized,
    -- Y-up (the geometry.bounds_center_x/y and offset_x/offset_y convention).
    local localTargetX = 0.5 + localCenterPxX / canvasWidth
    local localTargetY = 0.5 - localCenterPxY / canvasHeight

    -- Convert the local target position into a displacement from this
    -- target's own natural center (0.5 = no displacement), same pattern as
    -- the scale-aware alignment formula in appendix A.
    local offsetX = 0.5 + localTargetX - naturalCenterX
    local offsetY = 0.5 + localTargetY - naturalCenterY
    return offsetX, offsetY
end

---Sets a character or part's offset_x and offset_y toward a target canvas position.
---For parts, canvas_center_x/y is the natural center. This helper only inverts
---the optional 2D global transform; it does not invert an owning character
---transform, 3D transforms, camera settings, projection, or deformation.
---@param item table a character (ctx.chars[i]) or part (ctx.parts[i]) object
---@param canvasX number target canvas X coordinate (0.5 = center)
---@param canvasY number target canvas Y coordinate (0.5 = center, Y grows upward)
---@param ctx table|nil optional context table; if provided, inverts the 2D global transform
---@return number offsetX
---@return number offsetY
---@deprecated Use mt.layout.place_2d.
function mt.layout.set_canvas_position(item, canvasX, canvasY, ctx)
    if not item or not item.geometry then
        return 0.5, 0.5
    end

    local geom = item.geometry
    local isPart = item.character_index ~= nil
    local naturalCenterX = isPart and geom.canvas_center_x or geom.bounds_center_x
    local naturalCenterY = isPart and geom.canvas_center_y or geom.bounds_center_y
    naturalCenterX = naturalCenterX or geom.bounds_center_x or geom.canvas_center_x or 0.5
    naturalCenterY = naturalCenterY or geom.bounds_center_y or geom.canvas_center_y or 0.5

    local offsetX, offsetY
    if ctx and ctx.global and ctx.canvas then
        offsetX, offsetY = mt.layout.canvas_to_offset(
            ctx.global,
            ctx.canvas.width,
            ctx.canvas.height,
            naturalCenterX,
            naturalCenterY,
            canvasX,
            canvasY
        )
    else
        offsetX = 0.5 + (canvasX - naturalCenterX)
        offsetY = 0.5 + (canvasY - naturalCenterY)
    end

    item.offset_x = offsetX
    item.offset_y = offsetY
    return offsetX, offsetY
end

---Calculates an approximate axis-aligned bound before global, hierarchical,
---rotational, 3D, projection, and deformation transforms.
---@param ctx table
---@param targets table array of 1-based indices (characters or parts)
---@param targetType string|nil "character" (default) or "part"
---@return table|nil bounds table with { left, right, bottom, top, center_x, center_y, width, height }
---@deprecated Use mt.layout.measure_bounds_2d.
function mt.layout.group_bounds(ctx, targets, targetType)
    if not ctx or not targets or #targets == 0 then
        return nil
    end

    local isPart = (targetType == "part")
    local container = isPart and ctx.parts or ctx.chars
    local containerCount = isPart and ctx.part_count or ctx.char_count

    if not container or containerCount == 0 then
        return nil
    end

    local minX, maxX, minY, maxY = math.huge, -math.huge, math.huge, -math.huge
    local validCount = 0

    for _, idx in ipairs(targets) do
        if idx >= 1 and idx <= containerCount then
            local elem = container[idx]
            local geom = elem and elem.geometry

            if geom then
                local centerX, centerY, elemW, elemH

                if isPart then
                    local natX = geom.canvas_center_x or geom.bounds_center_x or 0.5
                    local natY = geom.canvas_center_y or geom.bounds_center_y or 0.5
                    local shiftX = (elem.offset_x or 0.5) - 0.5
                    local shiftY = (elem.offset_y or 0.5) - 0.5
                    centerX = natX + shiftX
                    centerY = natY + shiftY

                    local scaleX = math.abs((elem.scale or 1.0) * (elem.stretch_x or 1.0))
                    local scaleY = math.abs((elem.scale or 1.0) * (elem.stretch_y or 1.0))
                    elemW = (geom.local_width or geom.bounds_width or 0.0) * scaleX
                    elemH = (geom.local_height or geom.bounds_height or 0.0) * scaleY
                else
                    local natX = geom.bounds_center_x or 0.5
                    local natY = geom.bounds_center_y or 0.5
                    local shiftX = (elem.offset_x or 0.5) - 0.5
                    local shiftY = (elem.offset_y or 0.5) - 0.5
                    centerX = natX + shiftX
                    centerY = natY + shiftY

                    local scaleX = math.abs((elem.scale or 1.0) * (elem.stretch_x or 1.0))
                    local scaleY = math.abs((elem.scale or 1.0) * (elem.stretch_y or 1.0))
                    elemW = (geom.bounds_width or 0.0) * scaleX
                    elemH = (geom.bounds_height or 0.0) * scaleY
                end

                local halfW = elemW * 0.5
                local halfH = elemH * 0.5

                local left = centerX - halfW
                local right = centerX + halfW
                local bottom = centerY - halfH
                local top = centerY + halfH

                if left < minX then minX = left end
                if right > maxX then maxX = right end
                if bottom < minY then minY = bottom end
                if top > maxY then maxY = top end

                validCount = validCount + 1
            end
        end
    end

    if validCount == 0 then
        return nil
    end

    return {
        left = minX,
        right = maxX,
        bottom = minY,
        top = maxY,
        center_x = (minX + maxX) * 0.5,
        center_y = (minY + maxY) * 0.5,
        width = maxX - minX,
        height = maxY - minY,
    }
end

---Performs approximate advance-based re-typesetting after scale/stretch changes.
---@param ctx table
---@param gap number|nil
---@param config table|nil
---@deprecated Use mt.layout.reflow.
function mt.layout.retypeset(ctx, gap, config)
    local extraGap = gap or 0.0
    local currentConfig = config or {}
    local alignment = currentConfig.align or "baseline"
    local writingMode = currentConfig.mode or "horizontal"
    local baselineMode = currentConfig.baseline or "anchor"

    if ctx.char_count <= 0 then
        return
    end

    -- 1. Parse targets and prepare lookup table
    local targets = currentConfig.targets
    local isTarget = {}
    if targets and #targets > 0 then
        for _, val in ipairs(targets) do
            if val >= 1 and val <= ctx.char_count then
                isTarget[val] = true
            end
        end
    else
        for i = 1, ctx.char_count do
            isTarget[i] = true
        end
    end

    -- 2. Determine anchor character index
    local anchor = currentConfig.anchor
    if not anchor or anchor < 1 or anchor > ctx.char_count then
        -- Fallback to the first target index in order
        for i = 1, ctx.char_count do
            if isTarget[i] then
                anchor = i
                break
            end
        end
    end
    -- If no targets are active or valid, do nothing
    if not anchor then
        return
    end

    local anchorChar = ctx.chars[anchor]
    local anchorScaleX = anchorChar.scale * anchorChar.stretch_x
    local anchorScaleY = anchorChar.scale * anchorChar.stretch_y
    local anchorGeom = anchorChar.geometry

    if writingMode == "horizontal" then
        -- 3. Calculate the reference line from the anchor character.
        -- baselineMode "anchor" reads the anchor's CURRENT pose (scale and
        -- offset applied), so the line follows the anchor wherever its own
        -- animation takes it. "natural" reads the anchor's Base-layout pose
        -- (scale 1, no offset) on the cross axis only, so the line's height
        -- stays fixed no matter how the anchor is scaled per frame.
        local referenceScaleY = anchorScaleY
        local referenceOffsetY = anchorChar.offset_y - 0.5
        if baselineMode == "natural" then
            referenceScaleY = 1.0
            referenceOffsetY = 0.0
        end

        local baselineY = anchorGeom.bounds_center_y
            + referenceScaleY * (anchorGeom.canvas_origin_y - anchorGeom.bounds_center_y)
            + referenceOffsetY

        if alignment == "center" then
            baselineY = anchorGeom.bounds_center_y + referenceOffsetY
        elseif alignment == "top" then
            baselineY = anchorGeom.bounds_center_y + anchorGeom.bounds_height * 0.5
                - referenceScaleY * (anchorGeom.bounds_height * 0.5 - (anchorGeom.canvas_origin_y - anchorGeom.bounds_center_y))
                + referenceOffsetY
        elseif alignment == "bottom" then
            baselineY = anchorGeom.bounds_center_y - anchorGeom.bounds_height * 0.5
                + referenceScaleY * (anchorGeom.bounds_height * 0.5 + (anchorGeom.canvas_origin_y - anchorGeom.bounds_center_y))
                + referenceOffsetY
        end

        local anchorPenX = anchorGeom.bounds_center_x
            + anchorScaleX * (anchorGeom.canvas_origin_x - anchorGeom.bounds_center_x)
            + (anchorChar.offset_x - 0.5)

        -- Align anchor itself vertically if it is a target
        if isTarget[anchor] then
            if alignment == "center" then
                anchorChar.offset_y = 0.5 + baselineY - anchorGeom.bounds_center_y
            elseif alignment == "top" then
                anchorChar.offset_y = 0.5 + baselineY - anchorGeom.bounds_center_y
                    - (anchorScaleY - 1.0) * (anchorGeom.bounds_height * 0.5)
            elseif alignment == "bottom" then
                anchorChar.offset_y = 0.5 + baselineY - anchorGeom.bounds_center_y
                    + (anchorScaleY - 1.0) * (anchorGeom.bounds_height * 0.5)
            else
                anchorChar.offset_y = 0.5 + baselineY - anchorGeom.bounds_center_y
                    - anchorScaleY * (anchorGeom.canvas_origin_y - anchorGeom.bounds_center_y)
            end
        end

        -- 4. Align characters to the right of the anchor (bi-directional layout)
        local penX = anchorPenX + anchorScaleX * anchorGeom.advance_x + extraGap
        for index = anchor + 1, ctx.char_count do
            local character = ctx.chars[index]
            local scaleX = character.scale * character.stretch_x
            local scaleY = character.scale * character.stretch_y
            local geometry = character.geometry

            if isTarget[index] then
                character.offset_x = 0.5 + penX - geometry.bounds_center_x
                    - scaleX * (geometry.canvas_origin_x - geometry.bounds_center_x)

                if alignment == "center" then
                    character.offset_y = 0.5 + baselineY - geometry.bounds_center_y
                elseif alignment == "top" then
                    character.offset_y = 0.5 + baselineY - geometry.bounds_center_y
                        - (scaleY - 1.0) * (geometry.bounds_height * 0.5)
                elseif alignment == "bottom" then
                    character.offset_y = 0.5 + baselineY - geometry.bounds_center_y
                        + (scaleY - 1.0) * (geometry.bounds_height * 0.5)
                else
                    character.offset_y = 0.5 + baselineY - geometry.bounds_center_y
                        - scaleY * (geometry.canvas_origin_y - geometry.bounds_center_y)
                end
            end
            penX = penX + scaleX * geometry.advance_x + extraGap
        end

        -- 5. Align characters to the left of the anchor
        penX = anchorPenX
        for index = anchor - 1, 1, -1 do
            local character = ctx.chars[index]
            local scaleX = character.scale * character.stretch_x
            local scaleY = character.scale * character.stretch_y
            local geometry = character.geometry

            penX = penX - scaleX * geometry.advance_x - extraGap

            if isTarget[index] then
                character.offset_x = 0.5 + penX - geometry.bounds_center_x
                    - scaleX * (geometry.canvas_origin_x - geometry.bounds_center_x)

                if alignment == "center" then
                    character.offset_y = 0.5 + baselineY - geometry.bounds_center_y
                elseif alignment == "top" then
                    character.offset_y = 0.5 + baselineY - geometry.bounds_center_y
                        - (scaleY - 1.0) * (geometry.bounds_height * 0.5)
                elseif alignment == "bottom" then
                    character.offset_y = 0.5 + baselineY - geometry.bounds_center_y
                        + (scaleY - 1.0) * (geometry.bounds_height * 0.5)
                else
                    character.offset_y = 0.5 + baselineY - geometry.bounds_center_y
                        - scaleY * (geometry.canvas_origin_y - geometry.bounds_center_y)
                end
            end
        end

    elseif writingMode == "vertical" then
        -- 3. Calculate column axis relative to the anchor character.
        -- baselineMode "natural" pins the column's cross axis (X) to the
        -- anchor's Base-layout center, mirroring the horizontal case.
        local centerLineX = anchorGeom.bounds_center_x + (anchorChar.offset_x - 0.5)
        if baselineMode == "natural" then
            centerLineX = anchorGeom.bounds_center_x
        end
        local anchorPenY = anchorGeom.bounds_center_y
            + anchorScaleY * (anchorGeom.canvas_origin_y - anchorGeom.bounds_center_y)
            + (anchorChar.offset_y - 0.5)

        -- Align anchor itself horizontally if it is a target
        if isTarget[anchor] then
            anchorChar.offset_x = 0.5 + centerLineX - anchorGeom.bounds_center_x
        end

        -- 4. Align characters below the anchor (vertical bi-directional layout)
        local penY = anchorPenY + anchorScaleY * anchorGeom.advance_y - extraGap
        for index = anchor + 1, ctx.char_count do
            local character = ctx.chars[index]
            local scaleY = character.scale * character.stretch_y
            local geometry = character.geometry

            if isTarget[index] then
                character.offset_x = 0.5 + centerLineX - geometry.bounds_center_x
                character.offset_y = 0.5 + penY - geometry.bounds_center_y
                    - scaleY * (geometry.canvas_origin_y - geometry.bounds_center_y)
            end
            penY = penY + scaleY * geometry.advance_y - extraGap
        end

        -- 5. Align characters above the anchor
        penY = anchorPenY
        for index = anchor - 1, 1, -1 do
            local character = ctx.chars[index]
            local scaleY = character.scale * character.stretch_y
            local geometry = character.geometry

            penY = penY - scaleY * geometry.advance_y + extraGap

            if isTarget[index] then
                character.offset_x = 0.5 + centerLineX - geometry.bounds_center_x
                character.offset_y = 0.5 + penY - geometry.bounds_center_y
                    - scaleY * (geometry.canvas_origin_y - geometry.bounds_center_y)
            end
        end
    end
end

---------------------------------------------------------------------------
-- Motion path helpers (mt.path.*)
--
-- Both functions are closed-form: the same t always yields the same point,
-- so they compose with mt.stagger / mt.timeline.progress / mt.ease without
-- any per-frame state. Each returns (x, y, tangentX, tangentY); the tangent
-- is the raw derivative (not normalized), so a heading angle is
-- math.atan(tangentY, tangentX) and callers that need a unit vector divide
-- by math.sqrt(tangentX^2 + tangentY^2) themselves (kept out of the hot path
-- for callers that only need position, e.g. mt.path.bezier for a fixed
-- endpoint hop).
---------------------------------------------------------------------------

---@class MtPathPoint
---@field x number
---@field y number

---Evaluates one segment of a cubic Bezier curve (De Casteljau's algorithm)
---and its derivative with respect to t.
---@param p0 MtPathPoint
---@param p1 MtPathPoint
---@param p2 MtPathPoint
---@param p3 MtPathPoint
---@param t number
---@return number x, number y, number tangentX, number tangentY
function mt.path.bezier(p0, p1, p2, p3, t)
    local inverseT = 1.0 - t
    local weight0 = inverseT * inverseT * inverseT
    local weight1 = 3.0 * inverseT * inverseT * t
    local weight2 = 3.0 * inverseT * t * t
    local weight3 = t * t * t
    local x = weight0 * p0.x + weight1 * p1.x + weight2 * p2.x + weight3 * p3.x
    local y = weight0 * p0.y + weight1 * p1.y + weight2 * p2.y + weight3 * p3.y

    local tangentWeight0 = 3.0 * inverseT * inverseT
    local tangentWeight1 = 6.0 * inverseT * t
    local tangentWeight2 = 3.0 * t * t
    local tangentX = tangentWeight0 * (p1.x - p0.x) + tangentWeight1 * (p2.x - p1.x) + tangentWeight2 * (p3.x - p2.x)
    local tangentY = tangentWeight0 * (p1.y - p0.y) + tangentWeight1 * (p2.y - p1.y) + tangentWeight2 * (p3.y - p2.y)
    return x, y, tangentX, tangentY
end

---Evaluates a point and its derivative on the given Catmull-Rom segment
---(uniform parameterization, t in [0, 1] across this segment only).
---@param p0 MtPathPoint
---@param p1 MtPathPoint
---@param p2 MtPathPoint
---@param p3 MtPathPoint
---@param t number
---@return number x, number y, number tangentX, number tangentY
local function catmullRomSegment(p0, p1, p2, p3, t)
    local t2 = t * t
    local t3 = t2 * t
    local weight0 = -0.5 * t3 + t2 - 0.5 * t
    local weight1 = 1.5 * t3 - 2.5 * t2 + 1.0
    local weight2 = -1.5 * t3 + 2.0 * t2 + 0.5 * t
    local weight3 = 0.5 * t3 - 0.5 * t2
    local x = weight0 * p0.x + weight1 * p1.x + weight2 * p2.x + weight3 * p3.x
    local y = weight0 * p0.y + weight1 * p1.y + weight2 * p2.y + weight3 * p3.y

    local tangentWeight0 = -1.5 * t2 + 2.0 * t - 0.5
    local tangentWeight1 = 4.5 * t2 - 5.0 * t
    local tangentWeight2 = -4.5 * t2 + 4.0 * t + 0.5
    local tangentWeight3 = 1.5 * t2 - t
    local tangentX = tangentWeight0 * p0.x + tangentWeight1 * p1.x + tangentWeight2 * p2.x + tangentWeight3 * p3.x
    local tangentY = tangentWeight0 * p0.y + tangentWeight1 * p1.y + tangentWeight2 * p2.y + tangentWeight3 * p3.y
    return x, y, tangentX, tangentY
end

---Evaluates a point and its derivative along a Catmull-Rom spline through
---`points` (uniform parameterization; each consecutive pair of points spans
---an equal share of t regardless of their spacing). `t` is normalized over
---the whole path: 0 at the first point, 1 at the last. The first and last
---points are echoed as their own neighbor (clamped-end convention), so the
---curve passes exactly through every listed point without needing padding
---control points from the caller. Requires at least 2 points.
---@param points MtPathPoint[]
---@param t number
---@return number x, number y, number tangentX, number tangentY
function mt.path.catmull_rom(points, t)
    local pointCount = #points
    if pointCount < 2 then
        error("mt.path.catmull_rom: points must contain at least 2 points", 2)
    end

    local segmentCount = pointCount - 1
    local clampedT = mt.saturate(t)
    local scaledT = clampedT * segmentCount
    local segmentIndex = math.min(math.floor(scaledT), segmentCount - 1)
    local segmentT = scaledT - segmentIndex

    local index0 = math.max(segmentIndex, 1)
    local index1 = segmentIndex + 1
    local index2 = segmentIndex + 2
    local index3 = math.min(segmentIndex + 3, pointCount)

    local x, y, tangentX, tangentY =
        catmullRomSegment(points[index0], points[index1], points[index2], points[index3], segmentT)
    -- The clamped-end convention duplicates the first/last point as its own
    -- neighbor; the tangent formula above already divides by the uniform
    -- segment spacing, so it does not need a separate rescale here.
    return x, y, tangentX, tangentY
end

---------------------------------------------------------------------------
-- Text processing helpers
---------------------------------------------------------------------------

---Slice a UTF-8 string by code-point indices (1-based, inclusive).
---This does not preserve grapheme clusters.
---@param text string
---@param startChar integer
---@param endChar integer|nil
---@return string
function mt.text.slice(text, startChar, endChar)
    local result = ""
    if not text or text == "" then
        return result
    end
    local length = utf8.len(text)
    if not length or length == 0 then
        return result
    end

    local startIndex = math.max(1, startChar)
    local endIndex = endChar and math.min(length, endChar) or length

    if startIndex > endIndex then
        return result
    end

    local byteStart = utf8.offset(text, startIndex)
    local byteEnd = utf8.offset(text, endIndex + 1)

    if not byteStart then
        return result
    end

    if byteEnd then
        result = string.sub(text, byteStart, byteEnd - 1)
    else
        result = string.sub(text, byteStart)
    end
    return result
end

---------------------------------------------------------------------------
-- Timeline progress helpers
---------------------------------------------------------------------------

---Returns the host timeline progress, falling back to a looping progress if unavailable.
---@param ctx table
---@param fallbackDuration number|nil
---@return number
function mt.timeline.progress(ctx, fallbackDuration)
    local duration = fallbackDuration or 4.0
    local result = 0.0
    if ctx.timeline and ctx.timeline.available then
        result = ctx.timeline.progress
    else
        result = (ctx.time % duration) / duration
    end
    return result
end

---Resolves the clip duration and the clip-local elapsed seconds, substituting a
---virtual looping duration when the host timeline is unavailable.
---@param ctx table
---@param fallbackDuration number|nil
---@return number, number
local function resolveTimelineSpan(ctx, fallbackDuration)
    local duration = fallbackDuration or 4.0
    local elapsed = 0.0
    if ctx.timeline and ctx.timeline.available then
        duration = ctx.timeline.duration_seconds
        elapsed = math.min(math.max(ctx.time, 0.0), duration)
    elseif duration > 0.0 then
        elapsed = ctx.time % duration
    end
    return duration, elapsed
end

---Returns the remaining seconds until the clip end.
---@param ctx table
---@param fallbackDuration number|nil
---@return number
function mt.timeline.remaining(ctx, fallbackDuration)
    local duration, elapsed = resolveTimelineSpan(ctx, fallbackDuration)
    return duration - elapsed
end

---Real-time intro / outro progress in [0, 1], anchored to the clip head and tail.
---Both segments advance at a fixed speed regardless of the clip length; when the
---clip is shorter than introSeconds + outroSeconds, both are compressed
---proportionally so they still complete within the clip.
---@param ctx table
---@param introSeconds number
---@param outroSeconds number
---@param fallbackDuration number|nil
---@return number, number
function mt.timeline.intro_outro_seconds(ctx, introSeconds, outroSeconds, fallbackDuration)
    local duration, elapsed = resolveTimelineSpan(ctx, fallbackDuration)
    local introDuration = math.max(introSeconds, 0.0)
    local outroDuration = math.max(outroSeconds, 0.0)
    local totalDuration = introDuration + outroDuration
    if totalDuration > duration and totalDuration > 0.0 then
        local compression = duration / totalDuration
        introDuration = introDuration * compression
        outroDuration = outroDuration * compression
    end

    local introValue = 1.0
    if introDuration > 0.0 then
        introValue = mt.saturate(elapsed / introDuration)
    end

    local outroValue = 0.0
    if outroDuration > 0.0 then
        outroValue = mt.saturate((elapsed - (duration - outroDuration)) / outroDuration)
    end

    return introValue, outroValue
end

---Calculates the relative progress of intro and outro segments in [0, 1].
---@deprecated Fraction-based transitions stretch with the clip length; use mt.timeline.intro_outro_seconds.
---@param progress number
---@param introFraction number
---@param outroFraction number
---@return number, number
function mt.timeline.intro_outro(progress, introFraction, outroFraction)
    local introValue = 0.0
    if introFraction > 0.0 then
        introValue = mt.saturate(progress / introFraction)
    else
        introValue = 1.0
    end

    local outroValue = 0.0
    if outroFraction > 0.0 then
        outroValue = mt.saturate((progress - (1.0 - outroFraction)) / outroFraction)
    else
        outroValue = 0.0
    end

    return introValue, outroValue
end

---------------------------------------------------------------------------
-- Easing (Penner set, in_ / out_ / in_out_ variants + cubic_bezier)
--
-- Base curves are defined once in their "in" form; the out / in_out variants
-- are the standard reflections. Every public mt.ease key is assigned
-- explicitly below (no generated keys).
---------------------------------------------------------------------------

mt.ease = {}

---@param t number
---@return number
function mt.ease.linear(t)
    return t
end

local kBackOvershoot = 1.70158
local kElasticPeriod = 2.0 * math.pi / 3.0
local kBounceAmplitude = 7.5625
local kBounceInterval = 2.75

---@param t number
---@return number
local function easeInQuad(t)
    return t * t
end

---@param t number
---@return number
local function easeInCubic(t)
    return t * t * t
end

---@param t number
---@return number
local function easeInQuart(t)
    return t * t * t * t
end

---@param t number
---@return number
local function easeInSine(t)
    return 1.0 - math.cos(t * math.pi * 0.5)
end

---@param t number
---@return number
local function easeInCirc(t)
    return 1.0 - math.sqrt(1.0 - t * t)
end

---@param t number
---@return number
local function easeInExpo(t)
    local result = 0.0
    if t > 0.0 then
        result = 2.0 ^ (10.0 * t - 10.0)
    end
    return result
end

---@param t number
---@return number
local function easeInBack(t)
    return (kBackOvershoot + 1.0) * t * t * t - kBackOvershoot * t * t
end

---@param t number
---@return number
local function easeInElastic(t)
    local result = t
    if t > 0.0 and t < 1.0 then
        result = -(2.0 ^ (10.0 * t - 10.0)) * math.sin((t * 10.0 - 10.75) * kElasticPeriod)
    end
    return result
end

-- Bounce is canonically defined in its "out" form and reflected to "in".
---@param t number
---@return number
local function easeOutBounce(t)
    local result
    if t < 1.0 / kBounceInterval then
        result = kBounceAmplitude * t * t
    elseif t < 2.0 / kBounceInterval then
        local u = t - 1.5 / kBounceInterval
        result = kBounceAmplitude * u * u + 0.75
    elseif t < 2.5 / kBounceInterval then
        local u = t - 2.25 / kBounceInterval
        result = kBounceAmplitude * u * u + 0.9375
    else
        local u = t - 2.625 / kBounceInterval
        result = kBounceAmplitude * u * u + 0.984375
    end
    return result
end

---@param t number
---@return number
local function easeInBounce(t)
    return 1.0 - easeOutBounce(1.0 - t)
end

---Reflect an "in" curve into its "out" form.
---@param easeIn fun(t: number): number
---@return fun(t: number): number
local function reflected(easeIn)
    return function(t)
        return 1.0 - easeIn(1.0 - t)
    end
end

---Combine an "in" curve into its symmetric "in_out" form.
---@param easeIn fun(t: number): number
---@return fun(t: number): number
local function symmetric(easeIn)
    return function(t)
        local result
        if t < 0.5 then
            result = easeIn(t * 2.0) * 0.5
        else
            result = 1.0 - easeIn(2.0 - t * 2.0) * 0.5
        end
        return result
    end
end

mt.ease.in_quad = easeInQuad
mt.ease.out_quad = reflected(easeInQuad)
mt.ease.in_out_quad = symmetric(easeInQuad)
mt.ease.in_cubic = easeInCubic
mt.ease.out_cubic = reflected(easeInCubic)
mt.ease.in_out_cubic = symmetric(easeInCubic)
mt.ease.in_quart = easeInQuart
mt.ease.out_quart = reflected(easeInQuart)
mt.ease.in_out_quart = symmetric(easeInQuart)
mt.ease.in_sine = easeInSine
mt.ease.out_sine = reflected(easeInSine)
mt.ease.in_out_sine = symmetric(easeInSine)
mt.ease.in_circ = easeInCirc
mt.ease.out_circ = reflected(easeInCirc)
mt.ease.in_out_circ = symmetric(easeInCirc)
mt.ease.in_expo = easeInExpo
mt.ease.out_expo = reflected(easeInExpo)
mt.ease.in_out_expo = symmetric(easeInExpo)
mt.ease.in_back = easeInBack
mt.ease.out_back = reflected(easeInBack)
mt.ease.in_out_back = symmetric(easeInBack)
mt.ease.in_elastic = easeInElastic
mt.ease.out_elastic = reflected(easeInElastic)
mt.ease.in_out_elastic = symmetric(easeInElastic)
mt.ease.in_bounce = easeInBounce
mt.ease.out_bounce = easeOutBounce
mt.ease.in_out_bounce = symmetric(easeInBounce)

---CSS timing-function compatible cubic bezier: control points (x1, y1) and
---(x2, y2), endpoints fixed at (0, 0) / (1, 1). Solves x(s) = t by bisection
---and returns y(s).
---@param x1 number
---@param y1 number
---@param x2 number
---@param y2 number
---@param t number
---@return number
function mt.ease.cubic_bezier(x1, y1, x2, y2, t)
    local kBisectionSteps = 24
    -- Cubic bezier for a single component with p0 = 0, p3 = 1.
    local function sample(a, b, s)
        local invS = 1.0 - s
        return 3.0 * invS * invS * s * a + 3.0 * invS * s * s * b + s * s * s
    end
    local result
    if t <= 0.0 then
        result = 0.0
    elseif t >= 1.0 then
        result = 1.0
    else
        local low = 0.0
        local high = 1.0
        local s = t
        for _ = 1, kBisectionSteps do
            if sample(x1, x2, s) < t then
                low = s
            else
                high = s
            end
            s = (low + high) * 0.5
        end
        result = sample(y1, y2, s)
    end
    return result
end

---------------------------------------------------------------------------
-- Storage freeze (the host calls mt.__freeze once OnInitialize completes)
--
-- This is the one deliberate metatable construct in the prelude: it exists to
-- ENFORCE a documented contract (storage is const after init), not to build
-- API surface. Frozen tables are read-only proxies: reads and ipairs go
-- through __index, any write raises. Lua 5.4 removed __pairs, so the global
-- pairs is shimmed to iterate the hidden data table of a frozen proxy
-- transparently.
---------------------------------------------------------------------------

local setMetatable = setmetatable
local frozenDataByProxy = setMetatable({}, { __mode = "k" })
local rawPairs = pairs

---Drop-in replacement for the standard pairs that also iterates frozen
---proxies (their own key set is intentionally empty).
---@param value table
---@return function, table, any
function pairs(value)
    local hidden = frozenDataByProxy[value]
    if hidden ~= nil then
        value = hidden
    end
    return rawPairs(value)
end

---Recursively convert a value into a read-only view. Non-table values are
---returned as-is. Called by the host once OnInitialize completes; user
---scripts never need to call this.
---@param value any
---@return any
function mt.__freeze(value)
    local result = value
    if type(value) == "table" then
        local data = {}
        for key, entry in rawPairs(value) do
            data[key] = mt.__freeze(entry)
        end
        local proxy = setMetatable({}, {
            __index = data,
            __newindex = function()
                error("attempt to modify frozen mt.storage", 2)
            end,
            __len = function()
                return #data
            end,
        })
        frozenDataByProxy[proxy] = data
        result = proxy
    end
    return result
end
