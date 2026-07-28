# Mug Typography Lua Scripting API — `mt.*` Reference

Target API level: `5`

`mt` is a namespace containing utilities used for animation calculations, color manipulation, layout, paths, time control, and more.

> [!NOTE]
> For `time` or `t`, normally pass the elapsed time since the animation began. Use `ctx.time` when starting at the beginning of the clip, or `ctx.time - startTime` when starting partway through it.

<a id="section-mt"></a>

## Index by Purpose

| Purpose | API |
|---|---|
| Value constraints and range mapping | `mt.clamp` / `mt.saturate` / `mt.remap` / `mt.wrap` |
| Interpolation and keyframes | `mt.lerp` / `mt.inverse_lerp` / `mt.lerp_angle` / `mt.smoothstep` / `mt.keyframes` |
| Progress distribution | `mt.distribute` / `mt.stagger` / `mt.stagger_pattern` |
| Distance-based influence | `mt.falloff` |
| Deterministic random values and noise | `mt.random` / `mt.random_range` / `mt.noise1` / `mt.noise2` / `mt.wiggle` |
| Cycles and springs | `mt.cycle` / `mt.pingpong` / `mt.wave` / `mt.wave_square` / `mt.wave_triangle` / `mt.wave_sawtooth` / `mt.spring` |
| Displacement from polar coordinates | `mt.polar_offset_2d` |
| Physical motion | `mt.bounce_y` / `mt.bounce_x` / `mt.bounce_ground` / `mt.bounce_wall` / `mt.impact_squash` / `mt.projectile_2d` / `mt.friction_decay` |
| Color | `mt.color.lerp` / `mt.color.from_hsv` / `mt.color.with_alpha` / `mt.color.from_oklch` |
| Easing | `mt.ease.*` |
| Reflow and line-based grouping | `mt.layout.reflow` / `mt.layout.group_by_line` |
| Canvas position, distance, and pivot | `mt.layout.place_2d` / `mt.layout.get_canvas_position_2d` / `mt.layout.canvas_to_offset_2d` / `mt.layout.radial_distance` / `mt.layout.pivot_at_2d` |
| Bounds after 2D transforms | `mt.layout.measure_bounds_2d` |
| Alignment on paths | `mt.layout.queue_on_path` |
| Motion paths | `mt.path.bezier` / `mt.path.catmull_rom` / `mt.path.arc_length` |
| Path creation and editing | `mt.svg_path` / `path:*` |
| UTF-8 text processing | `mt.text.slice` / `mt.text.classify` |
| Clip time | `mt.timeline.progress` / `mt.timeline.remaining` / `mt.timeline.intro_outro_seconds` / `mt.timeline.window_ctx` / `mt.timeline.chain` |
| Deprecated compatibility APIs | `mt.storage` / `mt.polar_offset` / `mt.layout.retypeset` / `mt.layout.canvas_to_offset` / `mt.layout.set_canvas_position` / `mt.layout.group_bounds` / `mt.timeline.intro_outro` |

## 1. Value Constraints and Range Mapping

<a id="api-mt-clamp"></a>

### `mt.clamp(value, low, high)`

API level: `1+`

Constrains a value to the closed interval `[low, high]`.

#### Arguments

| Argument | Type | Unit | Default | Description |
|---|---|---|---|---|
| `value` | `number` | — | Required | Value to constrain |
| `low` | `number` | — | Required | Lower bound |
| `high` | `number` | — | Required | Upper bound |

#### Return Value

| Type | Unit | Description |
|---|---|---|
| `number` | — | Constrained value |

---

<a id="api-mt-saturate"></a>

### `mt.saturate(value)`

API level: `1+`

Shorthand for `mt.clamp(value, 0.0, 1.0)`. Use it to keep progress or alpha values within 0–1.

#### Arguments

| Argument | Type | Unit | Default | Description |
|---|---|---|---|---|
| `value` | `number` | — | Required | Value to constrain to 0–1 |

#### Return Value

| Type | Unit | Description |
|---|---|---|
| `number` | 0–1 | Value constrained to 0–1 |

---

<a id="api-mt-remap"></a>

### `mt.remap(value, in_low, in_high, out_low, out_high, clamped?)`

API level: `1+`

Maps a value from an input interval to an output interval. Use it for general interval conversions, such as converting seconds into progress.

#### Arguments

| Argument | Type | Unit | Default | Description |
|---|---|---|---|---|
| `value` | `number` | — | Required | Value to convert |
| `in_low` / `in_high` | `number` | — | Required | Input interval |
| `out_low` / `out_high` | `number` | — | Required | Output interval |
| `clamped` | `boolean` | — | `false` | If `true`, constrains the input position to 0–1 before conversion |

#### Return Value

| Type | Unit | Description |
|---|---|---|
| `number` | — | Converted value |

#### Constraints and Errors

| Condition | Description |
|---|---|
| `in_low == in_high` | Cannot be specified because the input interval would have zero width |

#### Example

```lua
-- Move the Y offset from 0.7 to 0.5 between 0.5 and 1.2 seconds
character.offset_y = mt.remap(ctx.time, 0.5, 1.2, 0.7, 0.5, true)
```

---

<a id="api-mt-wrap"></a>

### `mt.wrap(value, low, high)`

API level: `1+`

Wraps a value within the half-open interval `[low, high)`. Use it to make angles or hues periodic.

#### Arguments

| Argument | Type | Unit | Default | Description |
|---|---|---|---|---|
| `value` | `number` | — | Required | Value to wrap |
| `low` | `number` | — | Required | Start of the interval. Included in the result |
| `high` | `number` | — | Required | End of the interval. Not included in the result |

#### Return Value

| Type | Unit | Description |
|---|---|---|
| `number` | — | Wrapped value |

#### Constraints and Errors

Specify a `high` value greater than `low`. If `high <= low`, the function returns `low`.

## 2. Interpolation and Keyframes

<a id="api-mt-lerp"></a>

### `mt.lerp(from, to, t)`

API level: `1+`

Linearly interpolates from `from` to `to`.

#### Arguments

| Argument | Type | Unit | Default | Description |
|---|---|---|---|---|
| `from` | `number` | — | Required | Value when `t = 0` |
| `to` | `number` | — | Required | Value when `t = 1` |
| `t` | `number` | — | Required | Interpolation factor. It is not clamped, so values outside 0–1 produce extrapolation |

#### Return Value

| Type | Unit | Description |
|---|---|---|
| `number` | Same as the input values | `from + (to - from) * t` |

---

<a id="api-mt-inverse-lerp"></a>

### `mt.inverse_lerp(from, to, value)`

API level: `1+`

The inverse of `mt.lerp`. Returns the position of `value` within the interval `[from, to]` as an interpolation factor.

#### Arguments

| Argument | Type | Unit | Default | Description |
|---|---|---|---|---|
| `from` | `number` | — | Required | Start of the interval corresponding to a factor of 0 |
| `to` | `number` | — | Required | End of the interval corresponding to a factor of 1 |
| `value` | `number` | — | Required | Value whose position to calculate |

#### Return Value

| Type | Unit | Description |
|---|---|---|
| `number` | — | `(value - from) / (to - from)`. Not clamped |

#### Constraints and Errors

Returns `0` if `from == to`.

---

<a id="api-mt-lerp-angle"></a>

### `mt.lerp_angle(from, to, t)`

API level: `1+`

Interpolates angles in degrees along the **shortest direction**. Use it to avoid taking the long way around, as with `mt.lerp(350, 10, t)` (interpolates 350°→10° along the +20° direction).

#### Arguments

| Argument | Type | Unit | Default | Description |
|---|---|---|---|---|
| `from` | `number` | degree | Required | Starting angle |
| `to` | `number` | degree | Required | Target angle |
| `t` | `number` | — | Required | Interpolation factor. Not clamped |

#### Return Value

| Type | Unit | Description |
|---|---|---|
| `number` | degree | Interpolated angle |

---

<a id="api-mt-smoothstep"></a>

### `mt.smoothstep(edge0, edge1, value)`

API level: `1+`

Returns a value that transitions smoothly from 0 to 1 as `value` crosses from `edge0` to `edge1` (Hermite interpolation, with zero velocity at both ends).

#### Arguments

| Argument | Type | Unit | Default | Description |
|---|---|---|---|---|
| `edge0` | `number` | — | Required | Start of the transition, where the result is 0 |
| `edge1` | `number` | — | Required | End of the transition, where the result is 1 |
| `value` | `number` | — | Required | Value to evaluate |

#### Return Value

| Type | Unit | Description |
|---|---|---|
| `number` | 0–1 | Smooth transition value. Clamped outside the interval |

#### Constraints and Errors

| Condition | Description |
|---|---|
| `edge0 == edge1` | Cannot be specified because the transition interval would have zero width |

---

<a id="api-mt-keyframes"></a>

### `mt.keyframes(keys, time)`

API level: `1+`

Evaluates keyframes spanning multiple intervals. Because it can be called directly with `ctx.time`, you can write multistage choreography such as falling → bouncing → stopping without manually combining `clamp` and `inverse_lerp`.

#### Arguments

| Argument | Type | Unit | Default | Description |
|---|---|---|---|---|
| `keys` | `table[]` | — | Required | Array of keyframes. Each element has the form `{ t = <time>, v = <value>, ease = <optional> }`, ordered by ascending `t` |
| `time` | `number` | seconds | Required | Time to evaluate |

Each key’s `v` must be either a number or a color table of the form `{ r, g, b, a }`; the two types cannot be mixed within one `keys` array. `ease` is optional (linear by default) and is applied to the interval **leading up to that key**. You can pass a string naming an easing function, such as `mt.ease.out_bounce`, or any easing function in the form `function(t) ... end`.

If `time` is before the first key, the first value is returned; if it is after the last key, the last value is returned (clamping).

#### Return Value

| Type | Unit | Description |
|---|---|---|
| `number \| color` | Same as the key values | Value interpolated within the interval |

#### Example

```lua
-- Fall with a bounce from 0.0 to 0.3 seconds, remain still from 0.3 to 0.5 seconds,
-- then slowly exit toward the end of the clip after 0.5 seconds
local y = mt.keyframes({
    { t = 0.0, v = 1.2 },
    { t = 0.3, v = 0.5, ease = "out_bounce" },
    { t = 0.8, v = 0.5 },
    { t = 1.3, v = -0.2, ease = "in_cubic" },
}, ctx.time)

-- Colors can also be interpolated directly
local tint = mt.keyframes({
    { t = 0.0, v = { r = 1.0, g = 1.0, b = 1.0, a = 1.0 } },
    { t = 1.0, v = { r = 1.0, g = 0.4, b = 0.1, a = 1.0 } },
}, ctx.time)
character.fill.color = tint
```

## 3. Progress Distribution

<a id="api-mt-distribute"></a>

### `mt.distribute(index, count)`

API level: `1+`

Distributes a 1-based index evenly across 0–1. The first index maps to `0`, and the last maps to `1`.

#### Arguments

| Argument | Type | Unit | Default | Description |
|---|---|---|---|---|
| `index` | `integer` | — | Required | 1-based index, such as an index for `ctx.chars[index]` |
| `count` | `integer` | — | Required | Total count, such as `ctx.char_count` |

#### Return Value

| Type | Unit | Description |
|---|---|---|
| `number` | 0–1 | `(index - 1) / (count - 1)` constrained to 0–1. Returns `0` if `count <= 1` |

#### Example

```lua
-- Arrange hues in a rainbow according to character position
local hue = mt.distribute(index, ctx.char_count)
character.fill.use = true
character.fill.color = mt.color.from_hsv(hue, 0.8, 1.0)
```

---

<a id="api-mt-stagger"></a>

### `mt.stagger(time, index, delay, duration)`

API level: `1+`

Returns animation progress with a different start time for each index. This is the standard function for character-by-character animation. The animation for index `i` begins `delay * (i - 1)` seconds later and progresses from 0 to 1 over `duration` seconds.

#### Arguments

| Argument | Type | Unit | Default | Description |
|---|---|---|---|---|
| `time` | `number` | seconds | Required | Elapsed time since the animation began |
| `index` | `integer` | — | Required | 1-based index |
| `delay` | `number` | seconds | Required | Delay before the next index begins |
| `duration` | `number` | seconds | Required | Animation duration for each index |

#### Return Value

| Type | Unit | Description |
|---|---|---|
| `number` | 0–1 | Progress clamped to 0–1 |

#### Constraints and Errors

| Condition | Description |
|---|---|
| `duration <= 0` | Specify a value greater than 0 |

#### Example

```lua
for index = 1, ctx.char_count do
    local progress = mt.stagger(ctx.time, index, 0.08, 0.4)
    ctx.chars[index].offset_y = 0.5 + (1.0 - mt.ease.out_cubic(progress)) * 0.2
end
```

---

<a id="api-mt-stagger-pattern"></a>

### `mt.stagger_pattern(time, index, count, pattern, delay, duration, seed?)`

API level: `1+`

Returns staggered progress with a configurable starting direction or order.

#### Arguments

| Argument | Type | Unit | Default | Description |
|---|---|---|---|---|
| `time` | `number` | seconds | Required | Time to evaluate |
| `index` | `integer` | — | Required | 1-based index |
| `count` | `integer` | — | Required | Total count, such as `ctx.char_count` |
| `pattern` | `string` | — | Required | Progression pattern: `"asc"` / `"desc"` (alias `"right_to_left"`) / `"center"` / `"random"` |
| `delay` | `number` | seconds | Required | Start delay |
| `duration` | `number` | seconds | Required | Animation duration |
| `seed` | `integer` | — | `42` | Random seed when `pattern = "random"` |

`"random"` assigns an independent deterministic delay to each index. It does not produce a random permutation without duplicates.

#### Return Value

| Type | Unit | Description |
|---|---|---|
| `number` | 0–1 | Progress clamped to 0–1 |

#### Constraints and Errors

| Condition | Description |
|---|---|
| `duration <= 0` | Specify a value greater than 0 |

## 4. Distance-Based Influence

<a id="api-mt-falloff"></a>

### `mt.falloff(distance, radius)`

API level: `3+`

Returns an **influence weight** that is strongest at the center and decreases smoothly with distance. The return value is 0–1.

#### Arguments

| Argument | Type | Unit | Default | Description |
|---|---|---|---|---|
| `distance` | `number` | Input coordinate system | Required | Distance from the center of the effect |
| `radius` | `number` | Input coordinate system | Required | Spread of the falloff. At this distance, the weight is approximately `0.37` (`e^-1`) |

This is a standard choice for **concentrating an effect around a particular position**, such as a wave crest, a moving highlight, or emphasis focused on one location.

Choosing between it and `mt.smoothstep`: `smoothstep` becomes exactly 0 outside its range, creating a cutoff, whereas `falloff` has a tail that continues indefinitely. As a result, a moving crest or light appears to **pass through continuously**. It also avoids the corner produced by linear falloff such as (`1 - d/r`).

#### Return Value

| Type | Unit | Description |
|---|---|---|
| `number` | 0–1 | Distance-based influence weight |

#### Example

```lua
-- Raise only the characters currently being passed by the waveFront
local distance = characterRadius - waveFront
character.offset_y = 0.5 + mt.falloff(distance, 0.25) * 0.1
```

> [!NOTE]
> Passing `0` for `radius` returns `0` to avoid division by zero.

## 5. Deterministic Random Values and Noise

<a id="api-mt-random"></a>

### `mt.random(seed, index)`

API level: `1+`

A stable random value determined solely by the `(seed, index)` pair. Because it does not depend on call order, it can safely be used to vary individual characters or parts (`math.random` depends on call order and cannot be used safely for this purpose).

#### Arguments

| Argument | Type | Unit | Default | Description |
|---|---|---|---|---|
| `seed` | `integer` | — | Required | Value selecting the random sequence. Use the same seed for the same purpose |
| `index` | `integer` | — | Required | Position within the sequence, such as a character index |

#### Return Value

| Type | Unit | Description |
|---|---|---|
| `number` | 0–1 | Random value in `[0, 1)`. The same arguments always produce the same value |

---

<a id="api-mt-random-range"></a>

### `mt.random_range(seed, index, low, high)`

API level: `1+`

Returns the result of `mt.random` mapped to `[low, high)`.

#### Arguments

| Argument | Type | Unit | Default | Description |
|---|---|---|---|---|
| `seed` / `index` | `integer` | — | Required | Same as `mt.random` |
| `low` / `high` | `number` | — | Required | Output range |

#### Return Value

| Type | Unit | Description |
|---|---|---|
| `number` | Same as the output range | Stable random value in `[low, high)` |

---

<a id="api-mt-noise1"></a>

### `mt.noise1(x, seed?)`

API level: `1+`

Deterministic one-dimensional value noise. Returns a fluctuation that varies smoothly and continuously with `x`. Passing time as `x` produces temporal fluctuation; passing a position produces spatial fluctuation.

#### Arguments

| Argument | Type | Unit | Default | Description |
|---|---|---|---|---|
| `x` | `number` | — | Required | Sample position. Values are smoothly interpolated between lattice points at integer intervals |
| `seed` | `integer` | — | `0` | Value that changes the fluctuation pattern |

#### Return Value

| Type | Unit | Description |
|---|---|---|
| `number` | -1–1 | Continuous value that is always the same for the same arguments |

#### Example

```lua
-- Handheld-camera-style shake with a different phase for each character
character.rotation = mt.noise1(ctx.time * 0.8, index) * 4.0
```

---

<a id="api-mt-noise2"></a>

### `mt.noise2(x, y, seed?)`

API level: `1+`

Deterministic two-dimensional value noise. Returns smooth fluctuation at position `(x, y)`. Passing time on one axis and character position on the other can create fluctuation that “flows through space.”

#### Arguments

| Argument | Type | Unit | Default | Description |
|---|---|---|---|---|
| `x` / `y` | `number` | — | Required | Sample position |
| `seed` | `integer` | — | `0` | Value that changes the fluctuation pattern |

#### Return Value

| Type | Unit | Description |
|---|---|---|
| `number` | -1–1 | Continuous value that is always the same for the same arguments |

---

<a id="api-mt-wiggle"></a>

### `mt.wiggle(time, frequency, amplitude, octaves?, seed?)`

API level: `1+`

Returns a deterministic animation value for a rapid fluctuation (wiggle).

#### Arguments

| Argument | Type | Unit | Default | Description |
|---|---|---|---|---|
| `time` | `number` | seconds | Required | Time to evaluate |
| `frequency` | `number` | Hz | Required | Number of fluctuations per second |
| `amplitude` | `number` | Same as the output value | Required | Amplitude of the first octave. This is not the maximum sum across multiple octaves |
| `octaves` | `integer` | — | `1` | Number of noise octaves to layer |
| `seed` | `integer` | — | `0` | Random seed |

#### Return Value

| Type | Unit | Description |
|---|---|---|
| `number` | Same as `amplitude` | Fluctuation value |

When `octaves > 1`, the amplitudes are halved as they are added, so the theoretical absolute upper bound is `amplitude * (2 - 2^(1 - octaves))`, approaching `2 * amplitude` as the number of octaves increases.

## 6. Cycles and Springs

<a id="api-mt-cycle"></a>

### `mt.cycle(t, period)`

API level: `1+`

Looping progress that repeats values from 0 up to, but not including, 1 every `period` seconds. Use it as progress for looping animations.

#### Arguments

| Argument | Type | Unit | Default | Description |
|---|---|---|---|---|
| `t` | `number` | seconds | Required | Time to evaluate |
| `period` | `number` | seconds | Required | Length of one cycle |

#### Return Value

| Type | Unit | Description |
|---|---|---|
| `number` | 0–1 | Progress greater than or equal to 0 and less than 1 |

#### Constraints and Errors

| Condition | Description |
|---|---|
| `period <= 0` | Specify a value greater than 0 |

---

<a id="api-mt-pingpong"></a>

### `mt.pingpong(t, period)`

API level: `1+`

A value that travels 0→1→0 over `period` seconds. Use it for loops that go out and return.

#### Arguments

| Argument | Type | Unit | Default | Description |
|---|---|---|---|---|
| `t` | `number` | seconds | Required | Time to evaluate |
| `period` | `number` | seconds | Required | Length of one round trip |

#### Return Value

| Type | Unit | Description |
|---|---|---|
| `number` | 0–1 | Oscillating value from 0 to 1 |

#### Constraints and Errors

| Condition | Description |
|---|---|
| `period <= 0` | Specify a value greater than 0 |

---

<a id="api-mt-wave"></a>

### `mt.wave(t, frequency, phase?)`

API level: `1+`

Shorthand for the sine wave `sin(2π × frequency × t + phase)`.

#### Arguments

| Argument | Type | Unit | Default | Description |
|---|---|---|---|---|
| `t` | `number` | seconds | Required | Time to evaluate |
| `frequency` | `number` | Hz | Required | Number of cycles per second |
| `phase` | `number` | radian | `0` | Phase offset. It can also offset the wave for each index |

#### Return Value

| Type | Unit | Description |
|---|---|---|
| `number` | -1–1 | Waveform value |

---

<a id="api-mt-wave-square"></a>

### `mt.wave_square(t, frequency, phase?)`

API level: `1+`

A square wave.

#### Arguments

| Argument | Type | Unit | Default | Description |
|---|---|---|---|---|
| `t` | `number` | seconds | Required | Time to evaluate |
| `frequency` | `number` | Hz | Required | Number of cycles per second |
| `phase` | `number` | radian | `0` | Phase offset |

#### Return Value

| Type | Unit | Description |
|---|---|---|
| `number` | — | `-1.0` or `1.0` |

---

<a id="api-mt-wave-triangle"></a>

### `mt.wave_triangle(t, frequency, phase?)`

API level: `1+`

A triangle wave.

#### Arguments

| Argument | Type | Unit | Default | Description |
|---|---|---|---|---|
| `t` | `number` | seconds | Required | Time to evaluate |
| `frequency` | `number` | Hz | Required | Number of cycles per second |
| `phase` | `number` | radian | `0` | Phase offset |

#### Return Value

| Type | Unit | Description |
|---|---|---|
| `number` | -1–1 | Value that travels linearly back and forth between `-1.0` and `1.0` |

---

<a id="api-mt-wave-sawtooth"></a>

### `mt.wave_sawtooth(t, frequency, phase?)`

API level: `1+`

A sawtooth wave.

#### Arguments

| Argument | Type | Unit | Default | Description |
|---|---|---|---|---|
| `t` | `number` | seconds | Required | Time to evaluate |
| `frequency` | `number` | Hz | Required | Number of cycles per second |
| `phase` | `number` | radian | `0` | Phase offset |

#### Return Value

| Type | Unit | Description |
|---|---|---|
| `number` | -1–1 | Repeating value that rises linearly from `-1.0` to less than `1.0` |

---

<a id="api-mt-spring"></a>

### `mt.spring(t, frequency, damping)`

API level: `1+`

Evaluates a damped oscillation. It begins at `1` when `t = 0` and converges toward `0` while oscillating. Use it for motion that overshoots, oscillates, and then settles.

#### Arguments

| Argument | Type | Unit | Default | Description |
|---|---|---|---|---|
| `t` | `number` | seconds | Required | Elapsed time since the motion began. Returns the initial value when `t <= 0` |
| `frequency` | `number` | Hz | Required | Number of oscillations per second |
| `damping` | `number` | 1/second | Required | Damping strength. Larger values converge faster |

#### Return Value

| Type | Unit | Description |
|---|---|---|
| `number` | — | Damped oscillation value converging from the initial value 1 toward 0 |

For `t > 0`, it calculates `exp(-damping * t) * cos(2π * frequency * t)`.

> [!WARNING]
> **The return value is not confined to 0–1.** During damping, it can take **negative values** (and, depending on the phase, overshoot within a range that does not slightly exceed 1). This is the overshoot effect itself, analogous to `mt.ease.out_back` / `elastic` extending outside 0–1.
>
> - **Suitable uses**: A **residual displacement** such as `offset`, `rotation`, or scatter amount (for example, `0.5 + settle * 0.1`)
> - **Unsuitable uses**: Direct assignment to progress, `opacity`, `scale`, or `stretch`, or use as the `t` argument to `mt.lerp`. If you need progress, use `mt.ease.*` or `mt.saturate`, and do not multiply a scale factor directly by a negative value (`stretch` has no host-side lower-bound clamp and can reach rendering while still negative. `scale` is clamped to a positive lower bound, and `opacity` is clamped to 0–1 immediately before rendering)

#### Example

```lua
-- Use as deviation from the target position (maximum at t=0 and converges over time; negative intervals are overshoot)
local settle = mt.spring(ctx.time - start_time, 3.0, 4.0)
character.offset_y = 0.5 + settle * 0.1
```

## 7. Displacement from Polar Coordinates

<a id="api-mt-polar-offset-2d"></a>

### `mt.polar_offset_2d(angleDegrees, radius)`

API level: `5+`

Converts polar coordinates (direction and distance) into two offset values in Canvas space. It lets you express motion such as scattering, gathering, and orbiting without writing `cos` / `sin`.

#### Arguments

| Argument | Type | Unit | Default | Description |
|---|---|---|---|---|
| `angleDegrees` | `number` | degree | Required | Direction. As with [coordinates](https://mug-lab-3.github.io/mug-typography-docs/en/scripting/01_concepts#section-coordinates), 0 degrees points right and positive values rotate clockwise |
| `radius` | `number` | canvas normalized displacement | Required | Distance in that direction |

#### Return Value

| Type | Unit | Description |
|---|---|---|
| `number, number` | canvas normalized displacement | Two values: `offsetX, offsetY` |

The input angle uses the same screen-based convention as `rotation` / `shadow.angle` (90 degrees points down), but the returned values are Y-up. They can be added directly to `offset_x` / `offset_y`. `mt.projectile_2d` uses the same convention.

#### Example

```lua
-- Scatter characters radially
local angle = mt.distribute(index, ctx.char_count) * 360.0
local dx, dy = mt.polar_offset_2d(angle, 0.3 * scatterAmount)
character.offset_x = 0.5 + dx
character.offset_y = 0.5 + dy
```

## 8. Physical Motion

<a id="api-mt-bounce-y"></a>

<a id="api-mt-bounce-x"></a>

### `mt.bounce_y(config)` / `mt.bounce_x(config)`

API level: `3+`

Calculates and returns the position, velocity, Squash & Stretch, and contact-position correction for a one-dimensional ballistic bounce against a floor (Y axis) or wall (X axis). It does not modify characters or parts directly. Both a configuration-table form and a positional-argument form are supported.

#### Arguments

| Argument | Type | Unit | Default | Description |
|---|---|---|---|---|
| `config` | `table` | — | Required | Settings for time, collision surface, starting position, gravity or acceleration, restitution, initial velocity, and Squash & Stretch |

#### Shared `config`

| Field | Type | Unit | Default | Description |
|---|---|---|---|---|
| `t` | `number` | seconds | `0.0` | Elapsed time since the animation began |
| `restitution` | `number` | — | `0.5` | Coefficient of restitution. Larger values produce a stronger rebound after impact |
| `start_velocity` | `number` | canvas normalized displacement/second | `0.0` | Initial velocity along the axis |
| `squash` / `squash_strength` | `number` | factor | `0.15` | Strength with which the contact axis is compressed according to impact velocity |
| `stretch` / `stretch_strength` | `number` | factor | `0.02` | Strength with which the direction-of-motion axis is extended according to movement velocity |
| `flexibility` | `number` | radian/second | `16.0` | Oscillation speed when returning to the original shape after impact |
| `damping` | `number` | 1/second | `7.0` | Rate at which post-impact oscillation settles |

When an item has multiple names, the leftmost name takes precedence. Names to the right are compatibility aliases.

#### `config` Specific to `mt.bounce_y`

| Field | Type | Unit | Default | Description |
|---|---|---|---|---|
| `ground_y` | `number` | canvas normalized position | `0.0` | Y coordinate of the floor to collide with |
| `start_y` | `number` | canvas normalized position | `0.0` | Starting Y coordinate |
| `gravity` | `number` | canvas normalized displacement/second² | `9.81` | Magnitude of acceleration toward the floor |

#### `config` Specific to `mt.bounce_x`

| Field | Type | Unit | Default | Description |
|---|---|---|---|---|
| `wall_x` / `ground_x` | `number` | canvas normalized position | `0.0` | X coordinate of the wall to collide with. `ground_x` is a compatibility alias |
| `start_x` | `number` | canvas normalized position | `0.0` | Starting X coordinate |
| `acceleration` / `accel_x` / `gravity` | `number` | canvas normalized displacement/second² | `9.81` | Magnitude of acceleration toward the wall. `accel_x` and `gravity` are compatibility aliases |

#### Positional-Argument Form

Instead of a configuration table, you can pass each value in the following order.

```lua
mt.bounce_y(t, groundY, startY, gravity, restitution, startVelocity,
    squashStrength, stretchStrength, flexibility, damping)

mt.bounce_x(t, wallX, startX, acceleration, restitution, startVelocity,
    squashStrength, stretchStrength, flexibility, damping)
```

Each argument can be omitted and uses the same default as the corresponding `config` field.

#### Return Value

| Type | Unit | Description |
|---|---|---|
| `table` | — | In configuration-table form, a table containing position, velocity, deformation, and collision state |
| Multiple `number` values | As appropriate for each value | In positional-argument form, returns the calculation result as eight values |

#### Return-Value Table

| Field | Type | Unit | Description |
|---|---|---|---|
| `pos` | `number` | canvas normalized position | Calculated coordinate along the axis |
| `y` | `number` | canvas normalized position | Calculated Y coordinate for `mt.bounce_y`. Same value as `pos` |
| `x` | `number` | canvas normalized position | Calculated X coordinate for `mt.bounce_x`. Same value as `pos` |
| `velocity` | `number` | canvas normalized displacement/second | Velocity along the axis at that time |
| `stretch_x` / `stretch_y` | `number` | multiplier | X- and Y-axis stretch factors incorporating Squash & Stretch |
| `offset_y` | `number` | Ratio of `bounds_height` | Correction used by `mt.bounce_y` to preserve the contact position |
| `offset_x` | `number` | Ratio of `bounds_width` | Correction used by `mt.bounce_x` to preserve the contact position |
| `last_impact_time` | `number` / `nil` | seconds | Time of the previous impact. `nil` if no impact has occurred yet |
| `next_impact_time` | `number` / `nil` | seconds | Time of the next impact. `nil` if the object has already settled |
| `impact_count` | `integer` | impacts | Number of impacts so far |
| `settled` | `boolean` | — | Whether the bounce has ended and the object has settled |

The table’s `[1]` through `[5]` entries also provide, in order, the axis coordinate, `stretch_x`, `stretch_y`, contact-position correction, and `velocity`.

In positional-argument form, the function returns the axis coordinate, `stretch_x`, `stretch_y`, contact-position correction, `velocity`, `last_impact_time`, `next_impact_time`, and `impact_count`, in that order. `settled` is available only in configuration-table form.

#### Notes

- Normally, specify a `restitution` value greater than or equal to `0` and less than `1`.
- The sign of `gravity` or `acceleration` is ignored; its absolute value is treated as the acceleration magnitude.

#### Example

```lua
-- Precisely calculate Y-axis bounce physics with a detailed configuration table
local b = mt.bounce_y({
    t = ctx.time,
    ground_y = 0.1,
    start_y = 0.6,
    gravity = 9.81,
    restitution = 0.5,
    squash = 0.2,
    stretch = 0.03,
    flexibility = 18.0,
    damping = 6.0,
})

-- Apply the calculation results flexibly
local targetY = b.y + b.offset_y * char.geometry.bounds_height
local _, calcOffsetY = mt.layout.canvas_to_offset_2d(ctx, char, curX, targetY)
char.offset_y = calcOffsetY
char.stretch_x = b.stretch_x
char.stretch_y = b.stretch_y
```

---

<a id="api-mt-bounce-ground"></a>

### `mt.bounce_ground(ctx, item, groundY, config?)`

API level: `3+`

A simple convenience function that drops a character or part `item` toward the specified ground Canvas coordinate `groundY` (for example, `0.1`), then makes it bounce and land with a springy motion. `offset_y`, `stretch_x`, and `stretch_y` are applied automatically.

#### Arguments

| Argument | Type | Unit | Default | Description |
|---|---|---|---|---|
| `ctx` | `table` | — | Required | `OnLayout` context |
| `item` | `table` | — | Required | Character or part to modify |
| `groundY` | `number` | canvas normalized coordinate | Required | Y coordinate at which to land |
| `config` | `table` | — | `nil` | Settings such as starting position, contact reference, and physical parameters |

#### Return Value

| Type | Unit | Description |
|---|---|---|
| `table` | — | Calculated bounce state |

#### Changes

| Field | Type | Unit | Description |
|---|---|---|---|
| `item.offset_y` | `number` | canvas normalized displacement | Sets the calculated Y displacement |
| `item.offset_x` | `number` | canvas normalized displacement | When `ground_mode = "absolute"`, sets the displacement that preserves the current X position on the canvas |
| `item.stretch_x` / `item.stretch_y` | `number` | multiplier | Sets the Squash & Stretch from the bounce state |

#### `config`

| Field | Type | Unit | Default | Description |
|---|---|---|---|---|
| `t` | `number` | seconds | `ctx.time` | Time to evaluate |
| `delay` | `number` | seconds | `0.0` | Waiting time before motion begins |
| `start_mode` | `string` | — | `"absolute"` when `start_y` is specified; otherwise `"relative"` | Reference for the starting position. `"relative"` starts `drop_height` above the current position; `"absolute"` uses `start_y` |
| `start_y` | `number` | canvas normalized position | `nil` | Starting position used when `start_mode = "absolute"` |
| `drop_height` | `number` | canvas normalized displacement | `0.3` | Distance above the current position when `start_mode = "relative"` |
| `ground_mode` | `string` | — | Same as `start_mode` | Reference for the landing position. `"absolute"` treats `groundY` as a fixed position on the canvas; `"relative"` follows transforms higher in the hierarchy |
| `align_to` | `string` | — | `"bottom"` | Position to place on the ground. `"bottom"` / `"bounds_bottom"` means the bottom edge of the ink bounds, `"baseline"` means the typesetting baseline origin, and `"center"` means the center of the ink bounds |
| `gravity` | `number` | canvas normalized displacement/second² | `4.0` | Magnitude of acceleration toward the ground |
| `restitution` | `number` | — | `0.45` | Coefficient of restitution |
| `start_velocity` | `number` | canvas normalized displacement/second | `0.0` | Initial velocity along the Y axis |
| `squash` | `number` | factor | `0.15` | Strength with which the contact axis is compressed according to impact velocity |
| `stretch` | `number` | factor | `0.02` | Strength with which the direction-of-motion axis is extended according to movement velocity |
| `flexibility` | `number` | radian/second | `16.0` | Oscillation speed when returning to the original shape after impact |
| `damping` | `number` | 1/second | `7.0` | Rate at which post-impact oscillation settles |

When `ground_mode = "absolute"`, the landing position is calculated using the canvas-space bounding rectangle after rotation and scale have been applied.

#### Example

```lua
-- Drop every character vertically from a common fixed screen height (0.85) and land on the BB edge
mt.bounce_ground(ctx, ctx.chars[i], 0.1, { start_mode = "absolute", start_y = 0.85, align_to = "bottom" })

-- Drop from a position a fixed distance (0.3) above each character and align to the baseline
mt.bounce_ground(ctx, ctx.chars[i], 0.1, { start_mode = "relative", drop_height = 0.3, align_to = "baseline" })

-- Even with global.rotation applied, drop from screen position 0.85 and land precisely at screen position 0.1
mt.bounce_ground(ctx, ctx.chars[i], 0.1, {
    start_mode = "absolute", start_y = 0.85,
    ground_mode = "absolute", align_to = "bottom"
})
```

> [!NOTE]
> When `"absolute"` is specified, **both** `offset_x` and `offset_y` are written to place the item precisely at the specified Canvas position (rotation couples the two axes, so changing only one cannot reach the target coordinate). The offset on the non-bounce axis acts as a correction that preserves the current screen position.

---

<a id="api-mt-bounce-wall"></a>

### `mt.bounce_wall(ctx, item, wallX, config?)`

API level: `3+`

A simple convenience function that makes a character or part `item` collide with and bounce off the specified wall Canvas coordinate `wallX` (for example, `0.9`). `offset_x`, `stretch_x`, and `stretch_y` are applied automatically.

#### Arguments

| Argument | Type | Unit | Default | Description |
|---|---|---|---|---|
| `ctx` | `table` | — | Required | `OnLayout` context |
| `item` | `table` | — | Required | Character or part to modify |
| `wallX` | `number` | canvas normalized coordinate | Required | X coordinate of the collision target |
| `config` | `table` | — | `nil` | Settings such as starting position, collision reference, and physical parameters |

#### Return Value

| Type | Unit | Description |
|---|---|---|
| `table` | — | Calculated bounce state |

#### Changes

| Field | Type | Unit | Description |
|---|---|---|---|
| `item.offset_x` | `number` | canvas normalized displacement | Sets the calculated X displacement |
| `item.offset_y` | `number` | canvas normalized displacement | When `config.wall_mode = "absolute"`, sets the displacement that preserves the current Y position on the canvas |
| `item.stretch_x` / `item.stretch_y` | `number` | multiplier | Sets the Squash & Stretch at impact |

#### `config`

| Field | Type | Unit | Default | Description |
|---|---|---|---|---|
| `t` | `number` | seconds | `ctx.time` | Time to evaluate |
| `delay` | `number` | seconds | `0.0` | Waiting time before motion begins |
| `start_mode` | `string` | — | `"absolute"` when `start_x` is specified; otherwise `"relative"` | Reference for the starting position. `"relative"` starts `travel_distance` away from the current position in the direction opposite the wall; `"absolute"` uses `start_x` |
| `start_x` | `number` | canvas normalized position | `nil` | Starting position used when `start_mode = "absolute"` |
| `travel_distance` | `number` | canvas normalized displacement | `0.3` | Distance from the current position in the direction opposite the wall when `start_mode = "relative"` |
| `wall_mode` | `string` | — | Same as `start_mode` | Reference for the collision position. `"absolute"` treats `wallX` as a fixed position on the canvas; `"relative"` follows transforms higher in the hierarchy |
| `align_to` | `string` | — | Determined from the direction of travel | Position to make contact. Defaults to `"right"` when approaching from the left and `"left"` when approaching from the right. `"bounds_right"`, `"bounds_left"`, and `"center"` can also be specified |
| `accel` / `acceleration` | `number` | canvas normalized displacement/second² | `4.0` | Magnitude of acceleration toward the wall. `accel` takes precedence |
| `restitution` | `number` | — | `0.45` | Coefficient of restitution |
| `start_velocity` | `number` | canvas normalized displacement/second | `0.0` | Initial velocity along the X axis |
| `squash` | `number` | factor | `0.15` | Strength with which the contact axis is compressed according to impact velocity |
| `stretch` | `number` | factor | `0.02` | Strength with which the direction-of-motion axis is extended according to movement velocity |
| `flexibility` | `number` | radian/second | `16.0` | Oscillation speed when returning to the original shape after impact |
| `damping` | `number` | 1/second | `7.0` | Rate at which post-impact oscillation settles |

#### Example

```lua
-- Launch every part from a common fixed screen position (0.1) and bounce it off the wall (wallX = 0.9)
mt.bounce_wall(ctx, ctx.parts[i], 0.9, { start_mode = "absolute", start_x = 0.1, delay = i * 0.05 })

-- Launch from a position a fixed distance (0.25) behind each part
mt.bounce_wall(ctx, ctx.parts[i], 0.9, { start_mode = "relative", travel_distance = 0.25 })
```

---

<a id="api-mt-impact-squash"></a>

### `mt.impact_squash(config)`

API level: `3+`

Calculates a **Squash & Stretch impulse that compresses and rebounds at the instant of impact**. It uses the damped oscillation `sin(ωt) * exp(-γt)`, compressing most strongly immediately after impact and returning to the original shape while oscillating.

Because `mt.bounce_*` already applies Squash & Stretch internally, use this function when you want to represent an impact **at timing you control yourself**, such as colliding with another character or hitting something other than the ground.

#### Arguments

| Argument | Type | Unit | Default | Description |
|---|---|---|---|---|
| `config` | `table` | — | Required | Settings for impact time and deformation characteristics |

#### `config`

| Field | Type | Unit | Default | Description |
|---|---|---|---|---|
| `t` | `number` | seconds | `0.0` | Current time. Before `impact_time`, returns values with no deformation |
| `impact_time` | `number` | seconds | `0.0` | Time of impact. You can pass `last_impact_time` from `mt.bounce_*` |
| `squash` | `number` | ratio | `0.15` | Maximum compression amount. With `0.2`, the height is 80% at maximum compression |
| `stiffness` | `number` | radian/second | `25.0` | Speed of return to the original shape |
| `damping` | `number` | 1/second | `12.0` | Rate at which oscillation settles |

#### Return Value

| Type | Unit | Description |
|---|---|---|
| `number` | multiplier | `stretchX`. X-axis stretch factor |
| `number` | multiplier | `stretchY`. Y-axis stretch factor. It is the reciprocal of `stretchX` to preserve volume |
| `number` | Ratio of `bounds_height` | `offsetCorrection`. Corrects the contact-position shift caused by compression. Multiply it by `bounds_height` and add it to `offset_y` |

The name and meaning of `squash` are shared with the `squash` setting of `mt.bounce_*`.

#### Example

```lua
-- Choose the impact time yourself and apply compression
local sx, sy, correction = mt.impact_squash({
    t = ctx.time,
    impact_time = landTime,
    squash = 0.2,
})
character.stretch_x = sx
character.stretch_y = sy
character.offset_y = character.offset_y + correction * character.geometry.bounds_height
```

> [!TIP]
> **To vary the amount of compression according to impact velocity, calculate `squash` itself.**
> There is no argument that accepts velocity directly. With a method that simply multiplies by velocity, the compression reaches its lower limit after only a modest increase in velocity, so increasing the speed further no longer changes the image. Explicitly specifying “the velocity at which maximum compression occurs,” as below, keeps the result within the intended range.
>
> ```lua
> local squashAmount = 0.3 * mt.saturate(impactSpeed / kFullSquashSpeed)
> local sx, sy, correction = mt.impact_squash({ t = ctx.time, impact_time = landTime, squash = squashAmount })
> ```

---

<a id="api-mt-projectile-2d"></a>

### `mt.projectile_2d(config)` / `mt.projectile_2d(t, speed, angle, gravity?, spin?, drag?)`

API level: `3+`

Calculates **two-dimensional ballistic flight** from initial velocity and gravity. Whereas `mt.bounce_y` / `mt.bounce_x` model motion that hits and rebounds from a surface, this function is intended for **“thrown outward” motion that does not land**, such as scattering fragments, explosions, or tossing objects.

#### Arguments

| Argument | Type | Unit | Default | Description |
|---|---|---|---|---|
| `config` | `table` | — | Required | Settings such as elapsed time since launch, initial velocity, direction, and gravity |

#### `config`

| Field | Type | Unit | Default | Description |
|---|---|---|---|---|
| `t` | `number` | seconds | `0.0` | Elapsed time since launch. Negative values are treated as `0` |
| `speed` | `number` | canvas normalized displacement/second | `0.0` | Initial speed |
| `angle` | `number` | degrees | `0.0` | Launch direction. `0` points right, and the positive direction is clockwise. `-90` points straight up |
| `gravity` | `number` | canvas normalized displacement/second² | `4.0` | Downward acceleration |
| `spin` | `number` | degrees/second | `0.0` | Angular velocity. The returned `rotation` can be assigned directly to the field of the same name |
| `drag` | `number` | 1/second | `0.0` | Exponential decay rate for air resistance. `0` means no decay |
| `start_x` / `start_y` | `number` | canvas normalized position | `0.0` | Launch position. If omitted, returns displacement relative to the origin |

#### Positional-Argument Form

| Argument | Type | Unit | Default | Description |
|---|---|---|---|---|
| `t` | `number` | seconds | `0.0` | Elapsed time since launch. Negative values are treated as `0` |
| `speed` | `number` | canvas normalized displacement/second | `0.0` | Initial speed |
| `angle` | `number` | degrees | `0.0` | Launch direction |
| `gravity` | `number` | canvas normalized displacement/second² | `4.0` | Downward acceleration |
| `spin` | `number` | degrees/second | `0.0` | Angular velocity |
| `drag` | `number` | 1/second | `0.0` | Exponential decay rate for air resistance |

Because the launch position cannot be specified in positional-argument form, this form returns displacement relative to the origin.

#### Return Value

| Type | Unit | Description |
|---|---|---|
| `table` | — | In table form, returns a result containing `x`, `y`, `rotation`, `velocity_x`, and `velocity_y`. The same values are also available as `[1]` through `[5]` |
| Multiple `number` values | As appropriate for each value | In positional-argument form, returns `x`, `y`, `rotation`, `velocity_x`, and `velocity_y`, in that order |

> [!IMPORTANT]
> **The angle is screen-based (clockwise), but the returned `y` uses Canvas coordinates (positive upward).**
> With `angle = -90` (launched straight up), `y` increases and then begins decreasing under gravity. It can be added directly to `offset_y`.

#### Example

```lua
-- Scatter fragments in a fan and make them fall while rotating
local angle = mt.random_range(seed, index, -140.0, -40.0)
local speed = mt.random_range(seed, index + 100, 0.6, 1.2)
local flight = mt.projectile_2d({
    t = ctx.time - burstTime,
    speed = speed,
    angle = angle,
    gravity = 3.0,
    spin = mt.random_range(seed, index + 200, -360.0, 360.0),
})
part.offset_x = 0.5 + flight.x
part.offset_y = 0.5 + flight.y
part.rotation = flight.rotation
```

---

<a id="api-mt-friction-decay"></a>

### `mt.friction_decay(t, speed, friction)`

API level: `3+`

Calculates **exponential deceleration** caused by friction. It lets you control motion that “rushes in and glides to a stop” using the physical quantities **initial velocity and coefficient of friction**, rather than arrival time.

#### Arguments

| Argument | Type | Unit | Default | Description |
|---|---|---|---|---|
| `t` | `number` | seconds | Required | Elapsed time. Negative values are treated as `0` |
| `speed` | `number` | canvas normalized displacement/second | Required | Initial speed |
| `friction` | `number` | 1/second | `0.0` | Decay rate. Larger values stop sooner |

#### Return Value

| Type | Unit | Description |
|---|---|---|
| `number` | canvas normalized displacement | `distance`. Distance traveled so far |
| `number` | canvas normalized displacement/second | `currentSpeed`. Speed at that time |

The final travel distance converges to `speed / friction`. Conversely, if the stopping distance is known, you can set `speed = distance * friction`.

Choosing between it and `mt.ease.out_expo`: easing represents progress from 0→1 over a fixed duration, whereas this function treats initial velocity and friction as independent physical quantities. This allows adjustments such as **changing only the initial velocity while preserving the character of the deceleration**.

#### Example

```lua
-- Slide in from the left and stop through friction
local travelled = mt.friction_decay(ctx.time - startTime, 2.0, 4.0)
character.offset_x = 0.5 - 0.5 + travelled
```

> [!NOTE]
> When `friction` is extremely small (`1e-4` or less), motion is treated as uniform linear motion. This avoids numerical cancellation and is effectively equivalent to frictionless motion in practical use.

## 9. Color

See [“color” in Concepts](https://mug-lab-3.github.io/mug-typography-docs/en/scripting/01_concepts#section-color) for the color format.
All functions return a new color table and do not modify their arguments.

<a id="api-mt-color-lerp"></a>

### `mt.color.lerp(from, to, t)`

API level: `1+`

Linearly interpolates two colors component by component (RGBA).

#### Arguments

| Argument | Type | Unit | Default | Description |
|---|---|---|---|---|
| `from` | `color` | — | Required | Color when `t = 0` |
| `to` | `color` | — | Required | Color when `t = 1` |
| `t` | `number` | — | Required | Interpolation factor. Not clamped |

#### Return Value

| Type | Unit | Description |
|---|---|---|
| `color` | — | New color with each RGBA component interpolated |

---

<a id="api-mt-color-from-hsv"></a>

### `mt.color.from_hsv(hue, saturation, value, alpha?)`

API level: `1+`

Creates a color from normalized HSV values. This is a standard choice for hue animation.

#### Arguments

| Argument | Type | Unit | Default | Description |
|---|---|---|---|---|
| `hue` | `number` | 0–1 | Required | Hue. `1` completes one full turn, and values outside the range wrap automatically |
| `saturation` | `number` | 0–1 | Required | Saturation |
| `value` | `number` | 0–1 | Required | Brightness |
| `alpha` | `number` | 0–1 | `1.0` | Alpha value |

#### Return Value

| Type | Unit | Description |
|---|---|---|
| `color` | — | RGBA color converted from HSV |

---

<a id="api-mt-color-with-alpha"></a>

### `mt.color.with_alpha(color, alpha)`

API level: `1+`

Returns a new color with only its alpha replaced, preserving RGB.

#### Arguments

| Argument | Type | Unit | Default | Description |
|---|---|---|---|---|
| `color` | `color` | — | Required | Original color |
| `alpha` | `number` | 0–1 | Required | New alpha value |

#### Return Value

| Type | Unit | Description |
|---|---|---|
| `color` | — | New color preserving RGB and replacing only alpha |

---

<a id="api-mt-color-from-oklch"></a>

### `mt.color.from_oklch(lightness, chroma, hue, alpha?)`

API level: `1+`

Generates an RGBA color from the perceptually uniform OKLCH color space.

#### Arguments

| Argument | Type | Unit | Default | Description |
|---|---|---|---|---|
| `lightness` | `number` | 0–1 | Required | Lightness |
| `chroma` | `number` | — | Required | Colorfulness. Normally specified from about `0` to `0.4` |
| `hue` | `number` | 0–1 | Required | Hue. `1` completes one full turn, and values outside the range wrap automatically |
| `alpha` | `number` | 0–1 | `1.0` | Alpha value |

#### Return Value

| Type | Unit | Description |
|---|---|---|
| `color` | — | New color converted to sRGB, with each RGB component constrained to 0–1 |

## 10. Easing

API level: `1+`

`mt.ease.<name>(t)` accepts progress `t` (normally 0–1) and returns eased progress.
A typical use is to add character to the linear progress returned by `mt.stagger` or `mt.cycle`.
Except for `mt.ease.cubic_bezier`, the input `t` is not clamped automatically. To constrain it to 0–1, pass it through `mt.saturate` first.

Names combine a curve type and a direction.

- `in_` — Acceleration (starts slowly and ends quickly). Suitable for exits
- `out_` — Deceleration (starts quickly and stops slowly). Suitable for entrances
- `in_out_` — Accelerates in the first half and decelerates in the second

| Curve | Function Names | Characteristics |
|---|---|---|
| Linear | [`linear`](#api-mt-ease-linear) | Constant speed (no change) |
| Quad | [`in_quad`](#api-mt-ease-in-quad) / [`out_quad`](#api-mt-ease-out-quad) / [`in_out_quad`](#api-mt-ease-in-out-quad) | Gentlest acceleration and deceleration |
| Cubic | [`in_cubic`](#api-mt-ease-in-cubic) / [`out_cubic`](#api-mt-ease-out-cubic) / [`in_out_cubic`](#api-mt-ease-in-out-cubic) | Standard acceleration and deceleration. Start here when unsure |
| Quart | [`in_quart`](#api-mt-ease-in-quart) / [`out_quart`](#api-mt-ease-out-quart) / [`in_out_quart`](#api-mt-ease-in-out-quart) | Steeper than Cubic |
| Sine | [`in_sine`](#api-mt-ease-in-sine) / [`out_sine`](#api-mt-ease-out-sine) / [`in_out_sine`](#api-mt-ease-in-out-sine) | Extremely gentle easing derived from a sine wave |
| Circ | [`in_circ`](#api-mt-ease-in-circ) / [`out_circ`](#api-mt-ease-out-circ) / [`in_out_circ`](#api-mt-ease-in-out-circ) | Circular-arc curve that rises sharply at the endpoint |
| Expo | [`in_expo`](#api-mt-ease-in-expo) / [`out_expo`](#api-mt-ease-out-expo) / [`in_out_expo`](#api-mt-ease-in-out-expo) | Extremely strong exponential easing |
| Back | [`in_back`](#api-mt-ease-in-back) / [`out_back`](#api-mt-ease-out-back) / [`in_out_back`](#api-mt-ease-in-out-back) | **Overshoots once and then returns** (extends outside 0–1) |
| Elastic | [`in_elastic`](#api-mt-ease-in-elastic) / [`out_elastic`](#api-mt-ease-out-elastic) / [`in_out_elastic`](#api-mt-ease-in-out-elastic) | **Oscillates like a spring before settling** (extends outside 0–1) |
| Bounce | [`in_bounce`](#api-mt-ease-in-bounce) / [`out_bounce`](#api-mt-ease-out-bounce) / [`in_out_bounce`](#api-mt-ease-in-out-bounce) | Bounces as if against a floor |

Note that Back and Elastic can return values outside the 0–1 range; that excursion is the essence of their effect.

<a id="api-mt-ease-linear"></a>

### `mt.ease.linear(t)`

API level: `1+`

Constant-speed easing that returns the input progress unchanged.

#### Arguments

| Argument | Type | Unit | Default | Description |
|---|---|---|---|---|
| `t` | `number` | — | Required | Progress. Not clamped |

#### Return Value

| Type | Unit | Description |
|---|---|---|
| `number` | — | Same value as the input `t` |

---

<a id="api-mt-ease-in-quad"></a>

### `mt.ease.in_quad(t)`

API level: `1+`

Quadratic easing that starts slowly and gradually accelerates.

#### Arguments

| Argument | Type | Unit | Default | Description |
|---|---|---|---|---|
| `t` | `number` | — | Required | Progress. Not clamped |

#### Return Value

| Type | Unit | Description |
|---|---|---|
| `number` | — | Progress calculated as `t²` |

---

<a id="api-mt-ease-out-quad"></a>

### `mt.ease.out_quad(t)`

API level: `1+`

Quadratic easing that starts quickly and gradually decelerates.

#### Arguments

| Argument | Type | Unit | Default | Description |
|---|---|---|---|---|
| `t` | `number` | — | Required | Progress. Not clamped |

#### Return Value

| Type | Unit | Description |
|---|---|---|
| `number` | — | Progress calculated as `1 - (1 - t)²` |

---

<a id="api-mt-ease-in-out-quad"></a>

### `mt.ease.in_out_quad(t)`

API level: `1+`

Quadratic easing that accelerates in the first half and decelerates in the second.

#### Arguments

| Argument | Type | Unit | Default | Description |
|---|---|---|---|---|
| `t` | `number` | — | Required | Progress. Not clamped |

#### Return Value

| Type | Unit | Description |
|---|---|---|
| `number` | — | Progress that symmetrically combines `in_quad` and `out_quad` around `t = 0.5` |

---

<a id="api-mt-ease-in-cubic"></a>

### `mt.ease.in_cubic(t)`

API level: `1+`

Cubic easing that starts slowly and gradually accelerates.

#### Arguments

| Argument | Type | Unit | Default | Description |
|---|---|---|---|---|
| `t` | `number` | — | Required | Progress. Not clamped |

#### Return Value

| Type | Unit | Description |
|---|---|---|
| `number` | — | Progress calculated as `t³` |

---

<a id="api-mt-ease-out-cubic"></a>

### `mt.ease.out_cubic(t)`

API level: `1+`

Cubic easing that starts quickly and gradually decelerates.

#### Arguments

| Argument | Type | Unit | Default | Description |
|---|---|---|---|---|
| `t` | `number` | — | Required | Progress. Not clamped |

#### Return Value

| Type | Unit | Description |
|---|---|---|
| `number` | — | Progress calculated as `1 - (1 - t)³` |

---

<a id="api-mt-ease-in-out-cubic"></a>

### `mt.ease.in_out_cubic(t)`

API level: `1+`

Cubic easing that accelerates in the first half and decelerates in the second.

#### Arguments

| Argument | Type | Unit | Default | Description |
|---|---|---|---|---|
| `t` | `number` | — | Required | Progress. Not clamped |

#### Return Value

| Type | Unit | Description |
|---|---|---|
| `number` | — | Progress that symmetrically combines `in_cubic` and `out_cubic` around `t = 0.5` |

---

<a id="api-mt-ease-in-quart"></a>

### `mt.ease.in_quart(t)`

API level: `1+`

Quartic easing that starts slowly and accelerates more steeply than Cubic.

#### Arguments

| Argument | Type | Unit | Default | Description |
|---|---|---|---|---|
| `t` | `number` | — | Required | Progress. Not clamped |

#### Return Value

| Type | Unit | Description |
|---|---|---|
| `number` | — | Progress calculated as `t⁴` |

---

<a id="api-mt-ease-out-quart"></a>

### `mt.ease.out_quart(t)`

API level: `1+`

Quartic easing that starts quickly and decelerates more steeply than Cubic.

#### Arguments

| Argument | Type | Unit | Default | Description |
|---|---|---|---|---|
| `t` | `number` | — | Required | Progress. Not clamped |

#### Return Value

| Type | Unit | Description |
|---|---|---|
| `number` | — | Progress calculated as `1 - (1 - t)⁴` |

---

<a id="api-mt-ease-in-out-quart"></a>

### `mt.ease.in_out_quart(t)`

API level: `1+`

Quartic easing that accelerates in the first half and decelerates in the second.

#### Arguments

| Argument | Type | Unit | Default | Description |
|---|---|---|---|---|
| `t` | `number` | — | Required | Progress. Not clamped |

#### Return Value

| Type | Unit | Description |
|---|---|---|
| `number` | — | Progress that symmetrically combines `in_quart` and `out_quart` around `t = 0.5` |

---

<a id="api-mt-ease-in-sine"></a>

### `mt.ease.in_sine(t)`

API level: `1+`

Sine-wave-derived easing that accelerates extremely gently.

#### Arguments

| Argument | Type | Unit | Default | Description |
|---|---|---|---|---|
| `t` | `number` | — | Required | Progress. Not clamped |

#### Return Value

| Type | Unit | Description |
|---|---|---|
| `number` | — | Progress calculated as `1 - cos(t × π / 2)` |

---

<a id="api-mt-ease-out-sine"></a>

### `mt.ease.out_sine(t)`

API level: `1+`

Sine-wave-derived easing that decelerates extremely gently.

#### Arguments

| Argument | Type | Unit | Default | Description |
|---|---|---|---|---|
| `t` | `number` | — | Required | Progress. Not clamped |

#### Return Value

| Type | Unit | Description |
|---|---|---|
| `number` | — | Progress calculated as `sin(t × π / 2)` |

---

<a id="api-mt-ease-in-out-sine"></a>

### `mt.ease.in_out_sine(t)`

API level: `1+`

Sine-wave-derived easing that accelerates in the first half and decelerates in the second.

#### Arguments

| Argument | Type | Unit | Default | Description |
|---|---|---|---|---|
| `t` | `number` | — | Required | Progress. Not clamped |

#### Return Value

| Type | Unit | Description |
|---|---|---|
| `number` | — | Progress that symmetrically combines `in_sine` and `out_sine` around `t = 0.5` |

---

<a id="api-mt-ease-in-circ"></a>

### `mt.ease.in_circ(t)`

API level: `1+`

Circular-arc easing that accelerates sharply toward the endpoint.

#### Arguments

| Argument | Type | Unit | Default | Description |
|---|---|---|---|---|
| `t` | `number` | — | Required | Progress. Not clamped |

#### Return Value

| Type | Unit | Description |
|---|---|---|
| `number` | — | Progress calculated as `1 - √(1 - t²)` |

#### Constraints and Errors

Because the formula contains a square root, normally constrain `t` to 0–1 before use.

---

<a id="api-mt-ease-out-circ"></a>

### `mt.ease.out_circ(t)`

API level: `1+`

Circular-arc easing that advances sharply immediately after the start and then decelerates.

#### Arguments

| Argument | Type | Unit | Default | Description |
|---|---|---|---|---|
| `t` | `number` | — | Required | Progress. Not clamped |

#### Return Value

| Type | Unit | Description |
|---|---|---|
| `number` | — | Progress calculated as `√(1 - (1 - t)²)` |

#### Constraints and Errors

Because the formula contains a square root, normally constrain `t` to 0–1 before use.

---

<a id="api-mt-ease-in-out-circ"></a>

### `mt.ease.in_out_circ(t)`

API level: `1+`

Circular-arc easing that accelerates in the first half and decelerates in the second.

#### Arguments

| Argument | Type | Unit | Default | Description |
|---|---|---|---|---|
| `t` | `number` | — | Required | Progress. Not clamped |

#### Return Value

| Type | Unit | Description |
|---|---|---|
| `number` | — | Progress that symmetrically combines `in_circ` and `out_circ` around `t = 0.5` |

#### Constraints and Errors

Because the formula contains a square root, normally constrain `t` to 0–1 before use.

---

<a id="api-mt-ease-in-expo"></a>

### `mt.ease.in_expo(t)`

API level: `1+`

Exponential easing that accelerates extremely strongly toward the endpoint.

#### Arguments

| Argument | Type | Unit | Default | Description |
|---|---|---|---|---|
| `t` | `number` | — | Required | Progress. Not clamped |

#### Return Value

| Type | Unit | Description |
|---|---|---|
| `number` | — | `0` when `t <= 0`; otherwise progress calculated as `2^(10t - 10)` |

---

<a id="api-mt-ease-out-expo"></a>

### `mt.ease.out_expo(t)`

API level: `1+`

Exponential easing that advances extremely strongly immediately after the start and then decelerates.

#### Arguments

| Argument | Type | Unit | Default | Description |
|---|---|---|---|---|
| `t` | `number` | — | Required | Progress. Not clamped |

#### Return Value

| Type | Unit | Description |
|---|---|---|
| `number` | — | `1` when `t >= 1`; otherwise progress calculated as `1 - 2^(-10t)` |

---

<a id="api-mt-ease-in-out-expo"></a>

### `mt.ease.in_out_expo(t)`

API level: `1+`

Exponential easing that accelerates extremely strongly in the first half and decelerates extremely strongly in the second.

#### Arguments

| Argument | Type | Unit | Default | Description |
|---|---|---|---|---|
| `t` | `number` | — | Required | Progress. Not clamped |

#### Return Value

| Type | Unit | Description |
|---|---|---|
| `number` | — | Progress that symmetrically combines `in_expo` and `out_expo` around `t = 0.5` |

---

<a id="api-mt-ease-in-back"></a>

### `mt.ease.in_back(t)`

API level: `1+`

Easing that moves slightly backward in the negative direction immediately after the start, then accelerates toward the endpoint.

#### Arguments

| Argument | Type | Unit | Default | Description |
|---|---|---|---|---|
| `t` | `number` | — | Required | Progress. Not clamped |

#### Return Value

| Type | Unit | Description |
|---|---|---|
| `number` | — | Progress that overshoots below 0 near the start |

---

<a id="api-mt-ease-out-back"></a>

### `mt.ease.out_back(t)`

API level: `1+`

Easing that passes slightly beyond the endpoint and then decelerates while returning.

#### Arguments

| Argument | Type | Unit | Default | Description |
|---|---|---|---|---|
| `t` | `number` | — | Required | Progress. Not clamped |

#### Return Value

| Type | Unit | Description |
|---|---|---|
| `number` | — | Progress that overshoots above 1 near the endpoint |

---

<a id="api-mt-ease-in-out-back"></a>

### `mt.ease.in_out_back(t)`

API level: `1+`

Easing that overshoots near both the start and the endpoint.

#### Arguments

| Argument | Type | Unit | Default | Description |
|---|---|---|---|---|
| `t` | `number` | — | Required | Progress. Not clamped |

#### Return Value

| Type | Unit | Description |
|---|---|---|
| `number` | — | Progress that symmetrically combines `in_back` and `out_back` around `t = 0.5` |

---

<a id="api-mt-ease-in-elastic"></a>

### `mt.ease.in_elastic(t)`

API level: `1+`

Easing that accelerates toward the endpoint while oscillating with increasing amplitude.

#### Arguments

| Argument | Type | Unit | Default | Description |
|---|---|---|---|---|
| `t` | `number` | — | Required | Progress. Not clamped |

#### Return Value

| Type | Unit | Description |
|---|---|---|
| `number` | — | Progress that oscillates outside the 0–1 range. Returns `t` unchanged when `t <= 0` or `t >= 1` |

---

<a id="api-mt-ease-out-elastic"></a>

### `mt.ease.out_elastic(t)`

API level: `1+`

Easing that decelerates and converges while oscillating around the endpoint.

#### Arguments

| Argument | Type | Unit | Default | Description |
|---|---|---|---|---|
| `t` | `number` | — | Required | Progress. Not clamped |

#### Return Value

| Type | Unit | Description |
|---|---|---|
| `number` | — | Progress that oscillates outside the 0–1 range. Returns `t` unchanged when `t <= 0` or `t >= 1` |

---

<a id="api-mt-ease-in-out-elastic"></a>

### `mt.ease.in_out_elastic(t)`

API level: `1+`

Easing that accelerates while oscillating in the first half, then decelerates and converges while oscillating in the second.

#### Arguments

| Argument | Type | Unit | Default | Description |
|---|---|---|---|---|
| `t` | `number` | — | Required | Progress. Not clamped |

#### Return Value

| Type | Unit | Description |
|---|---|---|
| `number` | — | Progress that symmetrically combines `in_elastic` and `out_elastic` around `t = 0.5` |

---

<a id="api-mt-ease-in-bounce"></a>

### `mt.ease.in_bounce(t)`

API level: `1+`

Easing that bounces at the starting side before moving toward the endpoint.

#### Arguments

| Argument | Type | Unit | Default | Description |
|---|---|---|---|---|
| `t` | `number` | — | Required | Progress. Not clamped |

#### Return Value

| Type | Unit | Description |
|---|---|---|
| `number` | — | Time-reversed `out_bounce` progress |

---

<a id="api-mt-ease-out-bounce"></a>

### `mt.ease.out_bounce(t)`

API level: `1+`

Easing that decelerates toward the endpoint with multiple bounces as if against a floor.

#### Arguments

| Argument | Type | Unit | Default | Description |
|---|---|---|---|---|
| `t` | `number` | — | Required | Progress. Not clamped |

#### Return Value

| Type | Unit | Description |
|---|---|---|
| `number` | — | Progress representing bounces with a piecewise quadratic function |

---

<a id="api-mt-ease-in-out-bounce"></a>

### `mt.ease.in_out_bounce(t)`

API level: `1+`

Easing that bounces at both the starting and ending sides.

#### Arguments

| Argument | Type | Unit | Default | Description |
|---|---|---|---|---|
| `t` | `number` | — | Required | Progress. Not clamped |

#### Return Value

| Type | Unit | Description |
|---|---|---|
| `number` | — | Progress that symmetrically combines `in_bounce` and `out_bounce` around `t = 0.5` |

---

<a id="api-mt-ease-cubic-bezier"></a>

### `mt.ease.cubic_bezier(x1, y1, x2, y2, t)`

API level: `1+`

Evaluates a cubic Bézier curve compatible with the CSS `cubic-bezier()` timing function.
Use it to specify arbitrary easing numerically when the predefined curves above are insufficient.

#### Arguments

| Argument | Type | Unit | Default | Description |
|---|---|---|---|---|
| `x1` / `y1` | `number` | — | Required | First control point |
| `x2` / `y2` | `number` | — | Required | Second control point |
| `t` | `number` | — | Required | Progress. Fixed at `0` when `t <= 0` and at `1` when `t >= 1` |

#### Return Value

| Type | Unit | Description |
|---|---|---|
| `number` | — | Progress on the specified Bézier curve |

#### Constraints and Errors

When using it as a CSS-compatible monotonic timing curve, keep `x1` and `x2` within 0–1.

#### Example

```lua
-- Same curve as CSS ease-in-out
local eased = mt.ease.cubic_bezier(0.42, 0.0, 0.58, 1.0, progress)
```

## 11. Reflow and Line-Based Grouping

<a id="api-mt-layout-reflow"></a>

### `mt.layout.reflow(ctx, gap?, config?)`

API level: `2+`

For horizontal writing, uses `geometry.canvas_origin_*`; for vertical writing, uses `geometry.vertical_origin_*`. It applies the current `scale * stretch` to the advance while preserving spacing derived from shaping, kerning, tracking, and margins based on differences between adjacent natural origins. Per-character rotation and pivot are also included in origin alignment. This function does not equalize the distance between visible ink outlines.

#### Arguments

| Argument | Type | Unit | Default | Description |
|---|---|---|---|---|
| `ctx` | `table` | — | Required | `OnLayout` context |
| `gap` | `number` | Ratio of canvas width or height | `0.0` | Extra spacing added to adjacent advances. Positive values increase spacing in the direction of progression |
| `config` | `table` | — | `nil` | Settings for reflow direction, targets, and fixed position |

#### `config`

| Field | Type | Unit | Default | Description |
|---|---|---|---|---|
| `mode` | `string` | — | Determined from `ctx.global.vertical` | Direction to reflow: `"horizontal"` or `"vertical"` |
| `targets` | `table` | — | All characters | Array of 1-based character indices to reflow. If characters between targets are skipped, their advances are included in the calculation, but their coordinates are not changed |
| `anchor` | `integer` | — | First character in each line/column | Character index whose current transformed typesetting origin is fixed while characters are arranged on both sides |

When `targets` is omitted, all characters are reflowed with each `line_index` treated as an independent line/column, and the first character of each is fixed. When `config.anchor` is specified, only the line containing that character uses it as the fixed character.

#### Return Value

There is no return value.

#### Changes

Rewrites `offset_x` and `offset_y` for the target characters. Call it after setting size, rotation, and pivot animations, as the final layout operation for the frame.

#### Constraints and Errors

- Specify `"horizontal"` or `"vertical"` for `mode`.
- Indices in `targets` must be within the valid range, strictly ascending, and free of duplicates.
- All characters included in `targets` must belong to the same `line_index`.
- When `targets` is specified, `anchor` must identify a character included in that array.
- When `targets` is omitted, `anchor` must be a valid character index.

#### Example

```lua
mt.layout.reflow(ctx, 0.02, {
    targets = {3, 4, 7, 8}, -- Include 5 and 6 in the advance, but do not move them
    anchor = 3,
})
```

---

<a id="api-mt-layout-group-by-line"></a>

### `mt.layout.group_by_line(ctx)`

API level: `4+`

Groups shaped characters by `line_index` and returns them in the host’s reading order.
The groups represent lines in horizontal writing and columns in vertical writing. It does not modify layout or character properties.

#### Arguments

| Argument | Type | Unit | Default | Description |
|---|---|---|---|---|
| `ctx` | `table` | — | Required | `OnLayout` context |

#### Return Value

| Type | Unit | Description |
|---|---|---|
| `table` | — | Array containing one group per `line_index`, ordered by typeset line/column order |

Each group has the following fields.

| Field | Type | Unit | Description |
|---|---|---|---|
| `line_index` | `integer` | — | Index of the line/column corresponding to the group |
| `item_count` | `integer` | items | Number of characters in the group |
| `items` | `table` | — | Array of characters in reading order |

#### Example

```lua
local columns = mt.layout.group_by_line(ctx)
for columnOrder, column in ipairs(columns) do
    for indexInColumn, character in ipairs(column.items) do
        local start = (columnOrder - 1) * 0.2 + (indexInColumn - 1) * 0.05
        character.opacity = mt.saturate((ctx.time - start) / 0.4)
    end
end
```

## 12. Canvas Position, Distance, and Pivot

<a id="api-mt-layout-place-2d"></a>

### `mt.layout.place_2d(ctx, item, canvasX, canvasY)`

API level: `2+`

Precisely places the anchor of a character or part at a canvas normalized position **before 3D, camera, projection, and Deform are applied**. It composes and inverts the `offset` / `pivot` / `rotation` / `scale` / `stretch` of Global, the owning character, and the target itself using the same hierarchy and the same pixel coordinates for a non-square canvas as Native rendering.

- Character anchor: natural ink bounds center `geometry.bounds_center_x/y`
- Part anchor: part-local natural center (the local origin of the rendered path)

#### Arguments

| Argument | Type | Unit | Default | Description |
|---|---|---|---|---|
| `ctx` | `table` | — | Required | `OnLayout` context |
| `item` | `table` | — | Required | Target character or part |
| `canvasX` / `canvasY` | `number` | canvas normalized position | Required | Destination coordinates |

#### Return Value

| Type | Unit | Description |
|---|---|---|
| `number` | canvas normalized displacement | The assigned `offsetX` |
| `number` | canvas normalized displacement | The assigned `offsetY` |

#### Changes

Directly updates the target’s `offset_x` and `offset_y`.

#### Constraints and Errors

If `scale * stretch` is 0 anywhere in the transform hierarchy, the transform cannot be inverted and an error occurs.

#### Example

```lua
mt.layout.place_2d(ctx, ctx.chars[1], 0.8, 0.8)
mt.layout.place_2d(ctx, ctx.parts[1], 0.5, 0.5)
```

---

<a id="api-mt-layout-get-canvas-position-2d"></a>

### `mt.layout.get_canvas_position_2d(ctx, item)`

API level: `3+`

Gets the current Canvas coordinates `(canvasX, canvasY)` of a character or part anchor before 3D transforms, in the normalized Y-up coordinate system from 0.0 to 1.0. The function automatically determines whether `item` is a character (`ctx.chars[i]`) or a part (`ctx.parts[j]`).

#### Arguments

| Argument | Type | Unit | Default | Description |
|---|---|---|---|---|
| `ctx` | `table` | — | Required | `OnLayout` context |
| `item` | `table` | — | Required | Target character or part |

#### Return Value

| Type | Unit | Description |
|---|---|---|
| `number` | canvas normalized position | Anchor `canvasX` |
| `number` | canvas normalized position | Anchor `canvasY` |

#### Example

```lua
-- Get the Canvas position of a character
local charX, charY = mt.layout.get_canvas_position_2d(ctx, ctx.chars[1])

-- Get the Canvas position of a part (detected automatically)
local partX, partY = mt.layout.get_canvas_position_2d(ctx, ctx.parts[1])
```

---

<a id="api-mt-layout-canvas-to-offset-2d"></a>

### `mt.layout.canvas_to_offset_2d(ctx, item, canvasX, canvasY)`

API level: `3+`

Calculates and returns the `offset_x` and `offset_y` required to place a character or part at the specified Canvas coordinates `(canvasX, canvasY)` before 3D transforms, without rewriting the properties themselves. The type is detected automatically from the character or part passed as `item`.

#### Arguments

| Argument | Type | Unit | Default | Description |
|---|---|---|---|---|
| `ctx` | `table` | — | Required | `OnLayout` context |
| `item` | `table` | — | Required | Target character or part |
| `canvasX` / `canvasY` | `number` | canvas normalized position | Required | Destination coordinates |

#### Return Value

| Type | Unit | Description |
|---|---|---|
| `number` | canvas normalized displacement | Required `offsetX` |
| `number` | canvas normalized displacement | Required `offsetY` |

The target’s fields are not modified.

#### Constraints and Errors

An error occurs if `scale * stretch` is 0 in the parent hierarchy being inverted.

#### Example

```lua
-- Invert the transform to obtain the offset needed to place a character at Target Canvas coordinates (0.5, 0.8)
local cox, coy = mt.layout.canvas_to_offset_2d(ctx, ctx.chars[1], 0.5, 0.8)

-- Invert the transform to obtain the offset needed to place a part at Target Canvas coordinates (0.2, 0.3) (detected automatically)
local pox, poy = mt.layout.canvas_to_offset_2d(ctx, ctx.parts[1], 0.2, 0.3)
```

---

<a id="api-mt-layout-radial-distance"></a>

### `mt.layout.radial_distance(ctx, canvasX, canvasY, centerX?, centerY?)`

API level: `3+`

Returns the distance from the center of a radial effect to the specified Canvas coordinates. If `centerX` / `centerY` are omitted, the center of the screen `(0.5, 0.5)` is used.

#### Arguments

| Argument | Type | Unit | Default | Description |
|---|---|---|---|---|
| `ctx` | `table` | — | Required | Context containing canvas information |
| `canvasX` / `canvasY` | `number` | canvas normalized position | Required | Coordinates to measure |
| `centerX` / `centerY` | `number` | canvas normalized position | `0.5` | Center of the effect |

#### Return Value

| Type | Unit | Description |
|---|---|---|
| `number` | Ratio of canvas height | Aspect-ratio-corrected distance from the center |

> [!IMPORTANT]
> **The aspect ratio is corrected.** In normalized Canvas coordinates, a physical length of 1.0 differs between the horizontal and vertical axes. If distance is calculated simply as `sqrt(dx² + dy²)`, intended concentric circles become **squashed into ellipses** in a wide project such as 16:9. This function corrects the horizontal direction by multiplying it by `ctx.canvas.aspect_ratio`, so the returned distance is always based on true circles.

#### Example

```lua
-- A ripple expanding from the center. The crest passes each character according to its distance
for index = 1, ctx.char_count do
    local character = ctx.chars[index]
    local geometry = character.geometry
    local radius = mt.layout.radial_distance(ctx, geometry.bounds_center_x, geometry.bounds_center_y)
    local crest = mt.falloff(radius - waveFront, 0.2)
    character.offset_y = character.offset_y + crest * 0.08
end
```

---

<a id="api-mt-layout-pivot-at-2d"></a>

### `mt.layout.pivot_at_2d(ctx, item, anchor)`

API level: `4+`

Automatically determines whether the target is a character or part and sets its pivot to a semantic 2D position. It corrects `offset_x/y` by the difference between the local 2D matrices before and after the change, so the current pose before 3D application from rotation, scale, and stretch does not move.
Global is not supported. Preserving the visual result after yaw, pitch, z, camera, or projection is outside its scope.

#### Arguments

| Argument | Type | Unit | Default | Description |
|---|---|---|---|---|
| `ctx` | `table` | — | Required | `OnLayout` context |
| `item` | `table` | — | Required | Target character or part |
| `anchor` | `string` | — | Required | Name of the semantic 2D position to set |

#### Return Value

There is no return value.

#### Changes

Sets the target’s `pivot_x` and `pivot_y`, then corrects `offset_x` and `offset_y` so the pose does not move.

#### `anchor`

Shared anchors are `"center"`, `"top"`, `"bottom"`, `"left"`, `"right"`, `"top_left"`, `"top_right"`, `"bottom_left"`, and `"bottom_right"`. Characters additionally support `"baseline"`, `"vertical_start"`, `"vertical_center"`, and `"vertical_end"`.

Existing pivot values are not 0–1 ratios within the bounds. `0.5` is the natural center; X is displacement as a ratio of canvas width, and Y is displacement as a ratio of canvas height. This function converts the bounds dimensions, character typesetting origin, and differing natural centers of characters and parts into the existing pivot units.

#### Example

```lua
mt.layout.pivot_at_2d(ctx, character, "top")
character.rotation = math.sin(ctx.time * 3.0) * 8.0
```

## 13. Bounds After 2D Transforms

<a id="api-mt-layout-measure-bounds-2d"></a>

### `mt.layout.measure_bounds_2d(ctx, targets, targetType?)`

API level: `2+`

Transforms the natural bounding rectangles of the specified targets through the complete Global→character→part 2D hierarchy, then returns canvas-axis-aligned bounds enclosing all their vertices. When characters are specified, the natural bounds of their owned parts are combined; characters with no parts use the character’s natural bounds. Call it after writing the target fields.

These bounds are **before 3D, camera, projection, and Deform are applied**. They do not include stroke or shadow overhang, nor path-tight bounds for outlines containing whitespace within their natural bounding rectangle. For this stage and definition, the result is not an approximation: it incorporates rotation, pivot, negative stretch, parent-character transforms, and Global transforms.

#### Arguments

| Argument | Type | Unit | Default | Description |
|---|---|---|---|---|
| `ctx` | `table` | — | Required | `OnLayout` context |
| `targets` | `table` | — | Required | Array of 1-based character or part indices |
| `targetType` | `string` | — | `"character"` | Target type: `"character"` or `"part"` |

#### Return Value

| Type | Unit | Description |
|---|---|---|
| `table` | — | Bounds enclosing all valid targets |
| `nil` | — | If there are no valid targets |

The bounds table has the following fields. All coordinate systems are Y-up.

| Field | Type | Unit | Description |
|---|---|---|---|
| `left` / `right` | `number` | canvas normalized position | Left and right edges |
| `bottom` / `top` | `number` | canvas normalized position | Bottom and top edges |
| `center_x` / `center_y` | `number` | canvas normalized position | Center of the bounds |
| `width` / `height` | `number` | canvas normalized displacement | Width and height of the bounds |

#### Constraints and Errors

Specify `targets` as a table, and specify `"character"` or `"part"` for `targetType`.

#### Example

```lua
local bounds = mt.layout.measure_bounds_2d(ctx, {1, 2, 3})
if bounds then
    mt.layout.place_2d(ctx, ctx.chars[4], bounds.center_x, bounds.top + 0.05)
end
```

## 14. Alignment on Paths

<a id="api-mt-layout-queue-on-path"></a>

### `mt.layout.queue_on_path(ctx, path, options?)`

API level: `3+`

Arranges characters (or parts) on a path created by `mt.path.arc_length` **in reading order**, and returns the distance ratio (0–1) occupied by each element.

Spacing is derived from the origin spacing that the **host actually typeset**, using the same method as `mt.layout.reflow`. Parameter settings such as `tracking`, per-character `margins`, and kerning are therefore reflected directly in the character advance along the path. `options.gap` is **additional spacing** added on top of that, so when `gap` is `0`, elements are arranged according to the host’s character advance.

#### Arguments

| Argument | Type | Unit | Default | Description |
|---|---|---|---|---|
| `ctx` | `table` | — | Required | `OnLayout` context |
| `path` | `table` | — | Required | Return value of `mt.path.arc_length` |
| `options` | `table` | — | `nil` | Placement settings |
| `options.align` | `string` | — | `"end"` | Position at which to place the string. Specify `"end"`, `"start"`, or `"center"` |
| `options.gap` | `number` | Ratio of canvas width | `0.0` | Additional spacing added to the host’s character advance |
| `options.mode` | `string` | — | `"horizontal"` | Host typesetting direction: `"horizontal"` or `"vertical"` |
| `options.target_type` | `string` | — | `"character"` | Target type: `"character"` or `"part"` |
| `options.targets` | `table` | — | All elements | Array of target indices in reading order |

#### Return Value

| Type | Unit | Description |
|---|---|---|
| `table` | 0–1 | `slots` array indexed like `ctx.chars` or `ctx.parts`, providing the distance ratio occupied by each element on the path |

`slots` represents positions on the path, not animation progress.

#### Direction of Travel and Reading Order

Slots are assigned in **ascending distance along the direction of travel**. The reference is the path’s direction, not left and right on the screen. If `targets` is omitted, slots are assigned by ascending index; therefore, if the path travels from left to right, this directly produces screen reading order.

> [!IMPORTANT]
> **On a path traveling from right to left, ascending distance corresponds to decreasing x.** Therefore, when `targets` is omitted, character 1 is placed farthest right and character N farthest left, making the string appear **reversed on screen**.
> To produce a left-to-right-readable arrangement, pass `targets` in **reverse reading order**.

```lua
-- Preserve screen reading order on a path traveling from right to left
local targets = {}
for index = ctx.char_count, 1, -1 do
    targets[#targets + 1] = index
end
local slots = mt.layout.queue_on_path(ctx, path, { targets = targets })
```

This is a tradeoff: the following two properties cannot both be satisfied on a reversed path. Choose according to the use case.

| `targets` | On-Screen Arrangement | Front of the Queue |
|---|---|---|
| Omitted (ascending index) | Reversed (read right→left) | Character 1 |
| Reverse reading order | Correct (read left→right) | Last character |

`align` is likewise relative to the direction of travel. `"end"` places the end of the string at the **end of the path**, so on a path traveling right to left, the end of the string appears on the **left side** of the screen.

| Path Direction | Position of the String End with `align = "end"` |
|---|---|
| Left→right | Right side of the screen |
| Right→left | Left side of the screen |

#### Example

```lua
-- Use case 1: Arrange text along a path (stationary)
local path = mt.path.arc_length(kPathPoints, ctx.canvas.aspect_ratio)
local slots = mt.layout.queue_on_path(ctx, path, { gap = 0.004 })
for index = 1, ctx.char_count do
    local x, y, heading = path:at_distance(slots[index])
    ctx.chars[index].rotation = heading
    mt.layout.place_2d(ctx, ctx.chars[index], x, y)
end
```

```lua
-- Use case 2: Travel along the path and stop at each character's own slot (the queue brakes)
local path = mt.path.arc_length(kPathPoints, ctx.canvas.aspect_ratio)
local slots = mt.layout.queue_on_path(ctx, path, { align = "end" })
local progress = mt.ease.out_cubic(mt.saturate(ctx.time / 3.2))
for index = 1, ctx.char_count do
    -- math.min implements the queue's stopping behavior itself: the leader reaches the end, while each follower stops at its own position
    local x, y, heading = path:at_distance(math.min(progress, slots[index]))
    ctx.chars[index].rotation = heading
    mt.layout.place_2d(ctx, ctx.chars[index], x, y)
end
```

> [!NOTE]
> If the string’s total length exceeds the path length, distance ratios are clamped to 0 and 1, causing **characters to overlap**.
> When placing long text on a short path, use `path:length()` to confirm that it fits.

## 15. Motion Paths

These curve-evaluation APIs represent motion along control points, such as “flowing in” or “landing along an arc.”

The coordinate system is not fixed. Points are plain `{ x, y }` tables. The functions accept whichever coordinate system the caller passes, such as normalized offset coordinates, canvas pixels, or character-local coordinates, and return values in the same coordinate system.

> [!NOTE]
> **When assigning returned values directly to `offset_x` / `offset_y`, specify the points in offset units as well (the [canvas normalized displacement](https://mug-lab-3.github.io/mug-typography-docs/en/scripting/01_concepts#section-units) whose neutral value is `0.5`).** In the example below, the landing point is `{ x = 0.5, y = 0.5 }` (zero displacement), so `character.offset_x = x` lands directly at the natural position. If absolute canvas coordinates or zero-based local coordinates are assigned to offset unchanged, the character will move to an unintended position.

Every function returns four values: `x, y, tangentX, tangentY`. `tangentX` / `tangentY` are raw, unnormalized derivatives that also include travel speed. To obtain the direction angle, use `math.deg(math.atan(tangentY, tangentX))`; to obtain a unit vector, divide by `local length = math.sqrt(tangentX^2 + tangentY^2)`.

<a id="api-mt-path-bezier"></a>

### `mt.path.bezier(p0, p1, p2, p3, t)`

API level: `1+`

Returns the coordinates and tangent on a cubic Bézier curve defined by four points.

#### Arguments

| Argument | Type | Unit | Default | Description |
|---|---|---|---|---|
| `p0` | `table` | coordinates | Required | Starting point `{ x, y }` |
| `p1` | `table` | coordinates | Required | Control point near the start `{ x, y }` |
| `p2` | `table` | coordinates | Required | Control point near the end `{ x, y }` |
| `p3` | `table` | coordinates | Required | End point `{ x, y }` |
| `t` | `number` | 0–1 | Required | Position on the curve. Values outside the range are not clamped and are extrapolated unchanged |

#### Return Value

| Type | Unit | Description |
|---|---|---|
| `number` | As defined by the input coordinates | `x` on the curve |
| `number` | As defined by the input coordinates | `y` on the curve |
| `number` | As defined by the input coordinates | Tangent `tangentX` |
| `number` | As defined by the input coordinates | Tangent `tangentY` |

#### Example

```lua
-- Make the character follow an arc and land at its own natural position
local p0 = { x = 0.5, y = 0.2 }
local p1 = { x = 0.3, y = 0.6 }
local p2 = { x = 0.5, y = 0.5 }
local p3 = { x = 0.5, y = 0.5 }
local progress = mt.saturate(mt.stagger(ctx.time, index, 0.05, 0.6))
local x, y = mt.path.bezier(p0, p1, p2, p3, mt.ease.out_cubic(progress))
character.offset_x = x
character.offset_y = y
```

---

<a id="api-mt-path-catmull-rom"></a>

### `mt.path.catmull_rom(points, t)`

API level: `1+`

Returns the coordinates and tangent on a Catmull-Rom spline passing through any number of control points. Unlike a Bézier curve, this curve passes exactly through every point in the list.

#### Arguments

| Argument | Type | Unit | Default | Description |
|---|---|---|---|---|
| `points` | `table` | coordinates | Required | 1-based array containing at least two `{ x, y }` points through which the curve passes |
| `t` | `number` | 0–1 | Required | Progress across the entire curve. Clamped to 0–1 |

#### Return Value

| Type | Unit | Description |
|---|---|---|
| `number` | As defined by the input coordinates | `x` on the curve |
| `number` | As defined by the input coordinates | `y` on the curve |
| `number` | As defined by the input coordinates | Tangent `tangentX` |
| `number` | As defined by the input coordinates | Tangent `tangentY` |

#### Constraints and Errors

`points` must contain at least two points.

#### Example

```lua
-- Flow the character along a trajectory passing through three predetermined points
local waypoints = {
    { x = 0.1, y = 0.8 },
    { x = 0.5, y = 0.3 },
    { x = 0.9, y = 0.8 },
}
local progress = mt.saturate(ctx.time / 1.5)
local x, y = mt.path.catmull_rom(waypoints, progress)
character.offset_x = x
character.offset_y = y
```

---

<a id="api-mt-path-arc-length"></a>

### `mt.path.arc_length(points, aspectRatio?, options?)`

API level: `3+`

Constructs an **arc-length-parameterized** path from control points. The two functions above evaluate using curve parameter `t`, but **equal intervals of `t` are not equal distances**. Samples bunch together where the curve bends, so uses that require spacing by distance, such as queues, character advance along a path, or constant-speed motion, require a cumulative-length table. This function constructs that table once and provides distance-based lookup.

Passing `ctx.canvas.aspect_ratio` as `aspectRatio` multiplies X differences by it to equalize the meaning of distance on the horizontal and vertical axes. If omitted, distance is measured directly in normalized units, causing spacing to expand or contract on a non-square canvas.

#### Arguments

| Argument | Type | Unit | Default | Description |
|---|---|---|---|---|
| `points` | `table` | coordinates | Required | 1-based control-point array. Specifying canvas normalized coordinates allows use with `mt.layout.place_2d` and `mt.layout.queue_on_path` |
| `aspectRatio` | `number` | — | `1.0` | Aspect ratio multiplied into X-axis distances. Normally pass `ctx.canvas.aspect_ratio` |
| `options` | `table` | — | `nil` | Settings specifying the curve type |
| `options.kind` | `string` | — | `"catmull_rom"` | `"catmull_rom"` or `"bezier"` |

#### Return Value

| Type | Unit | Description |
|---|---|---|
| `table` | — | Path object providing distance-based lookup |

The path object has the following methods.

| Method | Return Value | Unit | Description |
|---|---|---|---|
| <a id="api-path-length"></a>`path:length()` | `number` | As defined by the input coordinates | Total path length corrected for aspect ratio |
| <a id="api-path-at-distance"></a>`path:at_distance(distanceRatio)` | Three `number` values | As defined by the input coordinates, degrees | `x`, `y`, and `headingDegrees` at distance ratio 0–1 |

#### Constraints and Errors

- `points` must contain at least two points.
- With `options.kind = "bezier"`, `points` must contain exactly four points.
- Specify `"catmull_rom"` or `"bezier"` for `options.kind`.

> [!NOTE]
> The third value returned by `at_distance` is a **direction in degrees, already converted to the screen coordinate system (where canvas Y points downward)**.
> It can be assigned directly to `rotation`. Unlike the raw tangents returned by `mt.path.bezier` / `catmull_rom`, you do not need to reverse the sign yourself.

The direction **follows the direction of travel**. On a path traveling from right to left, it is approximately 180 degrees, so assigning it directly to `rotation` turns characters upside down. Add `180.0` to keep them upright while preserving the slope.

```lua
-- Keep characters upright on a path traveling from right to left
character.rotation = heading + 180.0
```

#### Example

```lua
-- Place at equal distance intervals (equal intervals of t bunch up around bends)
local path = mt.path.arc_length(kWaypoints, ctx.canvas.aspect_ratio)
for index = 1, ctx.char_count do
    local ratio = mt.distribute(index, ctx.char_count)
    local x, y, heading = path:at_distance(ratio)
    ctx.chars[index].rotation = heading
    mt.layout.place_2d(ctx, ctx.chars[index], x, y)
end
```

## 16. Path Creation and Editing

<a id="api-mt-svg-path"></a>

### `mt.svg_path(source, optionsOrSourceUnitsPerEm?)`

API level: `5+`

Converts a string in the same format as an SVG `d` attribute into a reusable, read-only path template.
As a simplified SVG-compatible implementation, it supports absolute and relative `M` / `L` / `H` / `V` / `Q` / `T` / `C` / `S` / `Z` commands and consecutive coordinate sets. Elliptical arcs `A` / `a` are not supported.

#### Arguments

| Argument | Type | Unit | Default | Description |
|---|---|---|---|---|
| `source` | `string` | — | Required | SVG path data |
| `optionsOrSourceUnitsPerEm` | `number` / `table` | — | `nil` | Number of source-data units per em, or `{ view_box, em_scale }` |

#### Return Value

| Type | Unit | Description |
|---|---|---|
| `MtDrawingPath` | — | Read-only path template that can be passed to `path:assign(template)` |

#### Normalization Settings

When a number is specified, it is treated as the number of source-data units per em and normalized to 1000 units (for example, use `mt.svg_path(source, 24)` to treat 24 units as 1 em).

When `view_box = { minX, minY, width, height }` is specified, the viewBox center is moved to the origin, and the longest side is scaled to `em_scale` em while preserving the aspect ratio. The default `em_scale` is `1.0`.

#### Constraints and Errors

- A numeric units-per-em value must be a finite positive number.
- `view_box` must contain four finite numbers, and its width and height must be positive.
- `em_scale` must be a finite positive number.
- `units_per_em` cannot be specified in the configuration table. Use the numeric form or `em_scale`.

#### Example

```lua
local icon = mt.svg_path(svgPathFrom24PxIcon, {
    view_box = { 0, 0, 24, 24 },
    em_scale = 0.7,
})

function OnPath(ctx)
    for _, part in ipairs(ctx.paths:select("c1, p8-10, !p9")) do
        part.path:assign(icon)
    end
end
```

> [!IMPORTANT]
> `em_scale` is the rendered size, expressed as a multiple of 1 em. With `em_scale = 0.5`, the result is half-sized.
> In many fonts, the actual glyph face is smaller than 1 em, so the default `1.0` can cause an icon to overlap neighboring characters. In that case, lower `em_scale` or increase the character advance in `OnLayout`.

#### Notes

For a static SVG string, convert it with `mt.svg_path` outside the function and retain it in a `local` variable to avoid reparsing it every frame.

---

<a id="api-drawing-path"></a>

### Drawing Path Editing API

API level: `5+`

The `path` of a part obtained through `ctx.paths` can be edited with the following methods.

| Method | Description |
|---|---|
| [`path:clear()`](#api-path-clear) | Delete every command in the path |
| [`path:assign(template)`](#api-path-assign) | Replace with a template created by `mt.svg_path` |
| [`path:set_svg(source)`](#api-path-set-svg) | Parse SVG path data and replace the path |
| [`path:move_to(x, y)`](#api-path-move-to) | Add the starting point of a subpath |
| [`path:line_to(x, y)`](#api-path-line-to) | Add a line |
| [`path:quad_to(cx, cy, x, y)`](#api-path-quad-to) | Add a quadratic Bézier curve |
| [`path:cubic_to(cx1, cy1, cx2, cy2, x, y)`](#api-path-cubic-to) | Add a cubic Bézier curve |
| [`path:close()`](#api-path-close) | Close the current subpath |

#### Coordinate System

Path coordinates use normalized Y-down local coordinates with the part center as the origin, where 1000 units equal 1 em.
They are converted automatically to the actual font size at the API boundary and therefore do not depend on Canvas resolution.

#### Applying Changes

Because `ctx.paths` is reconstructed every frame, apply `path` changes every frame.
Parts to which changes are not applied revert to the original glyph outline.

---

<a id="api-path-clear"></a>

### `path:clear()`

API level: `5+`

Deletes all commands in the path.

#### Return Value

There is no return value.

#### Changes

Empties the target path and resets its coordinate-normalization settings to their initial values.

---

<a id="api-path-assign"></a>

### `path:assign(template)`

API level: `5+`

Replaces the path with the contents of a template created by `mt.svg_path`.

#### Arguments

| Argument | Type | Unit | Default | Description |
|---|---|---|---|---|
| `template` | `MtDrawingPath` | — | Required | Source path template to copy |

#### Return Value

There is no return value.

#### Changes

Replaces the target’s path data and coordinate-normalization settings with the template contents.

---

<a id="api-path-set-svg"></a>

### `path:set_svg(source)`

API level: `5+`

Parses SVG path data and replaces the target path.

#### Arguments

| Argument | Type | Unit | Default | Description |
|---|---|---|---|---|
| `source` | `string` | — | Required | Path data in the same format as an SVG `d` attribute |

#### Return Value

There is no return value.

#### Changes

Replaces the target path with the specified SVG path and resets its coordinate-normalization settings to their initial values.

---

<a id="api-path-move-to"></a>

### `path:move_to(x, y)`

API level: `5+`

Adds a new subpath beginning at the specified coordinates.

#### Arguments

| Argument | Type | Unit | Default | Description |
|---|---|---|---|---|
| `x` / `y` | `number` | Path-local coordinates | Required | Starting point of the subpath |

#### Return Value

There is no return value.

#### Changes

Adds a move command to the target path.

#### Constraints and Errors

Coordinates must be finite numbers.

---

<a id="api-path-line-to"></a>

### `path:line_to(x, y)`

API level: `5+`

Adds a straight line from the current position to the specified coordinates.

#### Arguments

| Argument | Type | Unit | Default | Description |
|---|---|---|---|---|
| `x` / `y` | `number` | Path-local coordinates | Required | End point of the line |

#### Return Value

There is no return value.

#### Changes

Adds a line command to the target path.

#### Constraints and Errors

Coordinates must be finite numbers.

---

<a id="api-path-quad-to"></a>

### `path:quad_to(cx, cy, x, y)`

API level: `5+`

Adds a quadratic Bézier curve from the current position to the specified end point.

#### Arguments

| Argument | Type | Unit | Default | Description |
|---|---|---|---|---|
| `cx` / `cy` | `number` | Path-local coordinates | Required | Control point |
| `x` / `y` | `number` | Path-local coordinates | Required | End point of the curve |

#### Return Value

There is no return value.

#### Changes

Adds a quadratic Bézier command to the target path.

#### Constraints and Errors

Coordinates must be finite numbers.

---

<a id="api-path-cubic-to"></a>

### `path:cubic_to(cx1, cy1, cx2, cy2, x, y)`

API level: `5+`

Adds a cubic Bézier curve from the current position to the specified end point.

#### Arguments

| Argument | Type | Unit | Default | Description |
|---|---|---|---|---|
| `cx1` / `cy1` | `number` | Path-local coordinates | Required | Control point near the current position |
| `cx2` / `cy2` | `number` | Path-local coordinates | Required | Control point near the end point |
| `x` / `y` | `number` | Path-local coordinates | Required | End point of the curve |

#### Return Value

There is no return value.

#### Changes

Adds a cubic Bézier command to the target path.

#### Constraints and Errors

Coordinates must be finite numbers.

---

<a id="api-path-close"></a>

### `path:close()`

API level: `5+`

Closes the current subpath by connecting it to its starting point.

#### Return Value

There is no return value.

#### Changes

Adds a close command to the target path.

## 17. UTF-8 Text Processing

<a id="api-mt-text-slice"></a>

### `mt.text.slice(text, startChar, endChar?)`

API level: `1+`

Slices a string at UTF-8 code-point boundaries. Unlike Lua’s standard byte-based `string.sub`, it does not cut through an individual UTF-8 code point. Because it does not operate on grapheme clusters, it can split combining characters or ZWJ-joined emoji in the middle of what appears to be one character.
`ctx.chars[index].text` is a cluster after shaping and does not use the same index concept as this function.

#### Arguments

| Argument | Type | Unit | Default | Description |
|---|---|---|---|---|
| `text` | `string` | — | Required | Target string |
| `startChar` | `integer` | — | Required | Starting code-point index. 1-based and inclusive |
| `endChar` | `integer` | — | End | Ending code-point index. 1-based and inclusive |

#### Return Value

| Type | Unit | Description |
|---|---|---|
| `string` | — | String sliced to the specified range. An empty string if the range is empty or invalid |

---

<a id="api-mt-text-classify"></a>

### `mt.text.classify(text)`

API level: `4+`

Classifies the first Unicode code point of a text cluster into a character-category name convenient for animation.

#### Arguments

| Argument | Type | Unit | Default | Description |
|---|---|---|---|---|
| `text` | `string` | — | Required | Text cluster to classify |

#### Return Value

| Type | Unit | Description |
|---|---|---|
| `string` | — | One of `"kanji"`, `"hiragana"`, `"katakana"`, `"punctuation"`, `"latin"`, `"digit"`, `"space"`, or `"other"` |

#### Example

```lua
for _, character in ipairs(ctx.chars) do
    if mt.text.classify(character.text) == "kanji" then
        character.scale = 1.2
    end
end
```

#### Notes

This is lightweight classification based on the first code point, not language detection across the entire grapheme cluster. Empty strings, emoji, combining marks, and anything else outside the defined ranges are classified as `"other"`.

## 18. Clip Time

<a id="api-mt-timeline-progress"></a>

### `mt.timeline.progress(ctx, fallbackDuration?)`

API level: `1+`

Gets the current progress from 0 to 1.

#### Arguments

| Argument | Type | Unit | Default | Description |
|---|---|---|---|---|
| `ctx` | `table` | — | Required | Context |
| `fallbackDuration` | `number` | seconds | `4.0` | Virtual clip length used for looping when the timeline is unavailable |

#### Return Value

| Type | Unit | Description |
|---|---|---|
| `number` | 0–1 | Current progress |

#### Constraints and Errors

When the timeline is unavailable, specify a positive value for `fallbackDuration`.

---

<a id="api-mt-timeline-remaining"></a>

### `mt.timeline.remaining(ctx, fallbackDuration?)`

API level: `1+`

Returns the actual number of seconds remaining until the end of the clip. This is a basic building block for writing an outro (exit animation) in real time anchored to the endpoint (see the design rules for [`ctx.timeline`](https://mug-lab-3.github.io/mug-typography-docs/en/scripting/02_ctx_reference#section-timeline)).

#### Arguments

| Argument | Type | Unit | Default | Description |
|---|---|---|---|---|
| `ctx` | `table` | — | Required | Context |
| `fallbackDuration` | `number` | seconds | `4.0` | Virtual clip length used for looping when the timeline is unavailable |

#### Return Value

| Type | Unit | Description |
|---|---|---|
| `number` | seconds | Time remaining until the end of the clip |

#### Example

```lua
-- Fade out during the final 0.5 seconds, regardless of clip length
local fade = mt.clamp(mt.timeline.remaining(ctx) / 0.5, 0.0, 1.0)
```

---

<a id="api-mt-timeline-intro-outro-seconds"></a>

### `mt.timeline.intro_outro_seconds(ctx, introSeconds, outroSeconds, fallbackDuration?)`

API level: `1+`

Returns progress for an intro anchored to the beginning of the clip and an outro anchored to the end, at a **fixed speed over the specified real number of seconds**. Changing the clip length does not change the transition speed. Only when the clip is shorter than `introSeconds + outroSeconds` are both intervals compressed proportionally to fit within the clip (automatic fast-forwarding).

#### Arguments

| Argument | Type | Unit | Default | Description |
|---|---|---|---|---|
| `ctx` | `table` | — | Required | Context |
| `introSeconds` | `number` | seconds | Required | Intro length. Negative values are treated as `0` |
| `outroSeconds` | `number` | seconds | Required | Outro length. Negative values are treated as `0` |
| `fallbackDuration` | `number` | seconds | `4.0` | Virtual clip length used when the timeline is unavailable |

#### Return Value

| Type | Unit | Description |
|---|---|---|
| `number` | 0–1 | `introProgress`. Intro progress |
| `number` | 0–1 | `outroProgress`. Outro progress |

#### Example

```lua
local intro, outro = mt.timeline.intro_outro_seconds(ctx, 0.8, 0.5)
character.offset_y = 0.5 + (1.0 - mt.ease.out_cubic(intro)) * 0.2
character.scale = character.scale * (1.0 - mt.ease.in_cubic(outro))
```

---

<a id="api-mt-timeline-window-ctx"></a>

### `mt.timeline.window_ctx(ctx, start, duration)`

API level: `4+`

Creates a derived ctx for a specified time window from the original ctx. `start` is the starting time in seconds within the original ctx, and `duration` is a positive window length.
The derived ctx’s `time` is `ctx.time - start` clamped to `0–duration`; `frame`, `timeline.duration_*`, and `timeline.progress` are also converted to the same local time basis.
All other values, including canvas, Global, chars, and parts, are inherited from the original ctx.

#### Arguments

| Argument | Type | Unit | Default | Description |
|---|---|---|---|---|
| `ctx` | `table` | — | Required | Original context |
| `start` | `number` | seconds | Required | Start time within the original context |
| `duration` | `number` | seconds | Required | Length of the time window |

#### Return Value

| Type | Unit | Description |
|---|---|---|
| `table` | — | Derived context whose time-related values are remapped to the specified window |

#### Constraints and Errors

- `ctx.time` must be a number.
- `start` must be a finite number.
- `duration` must be a finite positive number.

#### Example

```lua
local characterCtx =
    mt.timeline.window_ctx(ctx, (index - 1) * 0.08, 0.5)

local bounce = mt.bounce_y({ t = characterCtx.time })
local opacity = mt.ease.out_cubic(characterCtx.timeline.progress)
```

#### Notes

This API does not copy the original ctx or shared characters and parts. It is a shallow derived context that replaces only time-related values.

---

<a id="api-mt-timeline-chain"></a>

### `mt.timeline.chain(ctx, initialValue, segments, options?)`

API level: `4+`

Evaluates pure functions for time intervals in sequence and passes the final return value of each completed interval to the next interval.
An `evaluate` before the current time is evaluated with that interval’s end context, while only the current interval is evaluated with its interval-local `ctx`.
The return value may be any Lua value, including a number, color, or table combining coordinates and transforms.

#### Arguments

| Argument | Type | Unit | Default | Description |
|---|---|---|---|---|
| `ctx` | `table` | — | Required | Original context |
| `initialValue` | Any | — | Required | Initial value passed to the first interval |
| `segments` | `table` | — | Required | Array of animation or hold intervals |
| `options` | `table` | — | `nil` | Settings used when the timeline is unavailable |
| `options.fallback_duration` | `number` | seconds | `4.0` | Virtual clip length |

#### Return Value

| Type | Unit | Description |
|---|---|---|
| Any | — | Value of the last interval evaluated through the current time |

#### Example

```lua
local result = mt.timeline.chain(ctx, initialValue, {
    {
        duration = 1.0,
        evaluate = function(segmentCtx, previousValue)
            return enterAnimation(segmentCtx, previousValue)
        end,
    },
    { hold = 0.5 },
    {
        duration = 1.2,
        evaluate = function(segmentCtx, previousValue)
            return bounceAnimation(segmentCtx, previousValue)
        end,
    },
})
```

#### Interval Context

`segmentCtx` inherits canvas, Global, chars, parts, and other values from the caller’s `ctx`, replacing only time-related values with those of the current interval.
It can be passed like a normal `ctx` to existing Level 3 APIs that read `ctx`, such as `mt.timeline.progress`.

| Field | Type | Unit | Description |
|---|---|---|---|
| `segmentCtx.time` | `number` | seconds | Time since the interval began |
| `segmentCtx.frame` | `number` | frame | Number of frames since the interval began |
| `segmentCtx.fps` | `number` | fps | Same frame rate as the caller |
| `segmentCtx.timeline.duration_seconds` | `number` | seconds | Logical duration of the interval |
| `segmentCtx.timeline.duration_frames` | `number` | frame | Logical duration of the interval converted to frames |
| `segmentCtx.timeline.progress` | `number` | 0–1 | Progress within the interval |

#### Interval Forms

Each interval uses one of the following forms.

| Interval | Specification | Behavior |
|---|---|---|
| Fixed-length animation | `{ duration = seconds, evaluate = function }` | Uses the return value of `evaluate(segmentCtx, previousValue)` |
| Fixed-length hold | `{ hold = seconds }` | Retains the preceding value without calling a function |
| Variable-length animation | `{ duration = "remaining", evaluate = function }` | Uses the remaining clip duration after fixed intervals are excluded |
| Variable-length hold | `{ hold = "remaining" }` | Retains the preceding value for the remaining clip duration |

`"remaining"` can be specified for only one interval within a chain. If a fixed-length outro follows it, only the variable interval absorbs changes in clip length, while the outro always completes at the end of the clip.

```lua
local state = mt.timeline.chain(ctx, initialState, {
    { duration = 1.0, evaluate = evaluateIntro },
    { duration = 1.2, evaluate = evaluateBounce },
    { duration = "remaining", evaluate = evaluateIdle },
    { duration = 0.6, evaluate = evaluateOutro },
}, {
    fallback_duration = 6.0,
})
```

If the total length of fixed intervals exceeds the clip length, all fixed intervals are compressed proportionally.
Because `segmentCtx.time` and `segmentCtx.timeline` are remapped to the declared duration, every animation reaches its ending state even in a short clip.
When the timeline is unavailable, `options.fallback_duration` (default `4.0` seconds) is used as a virtual looping clip length.

#### Constraints and Errors

- `ctx.time` must be a number, and `segments` and `options` must be tables.
- Each interval must specify exactly one of `duration` or `hold`.
- A `duration` interval requires an `evaluate` function, which cannot be specified for a `hold` interval.
- An interval length must be a finite number greater than or equal to 0, or `"remaining"`.
- Only one interval may specify `"remaining"`.
- `options.fallback_duration` must be a finite positive number.

> [!IMPORTANT]
> `evaluate` is reevaluated within the same frame to obtain the ending values of past intervals. Write it as a pure function that returns a value calculated from its arguments without directly modifying `ctx` or a character, and apply only the final result.
> Combine value-returning APIs such as `mt.bounce_y` with `segmentCtx.time`, rather than using APIs such as `mt.bounce_ground` that modify an item directly.

## 19. Deprecated Compatibility APIs

<a id="api-mt-storage"></a>

### `mt.storage` `Deprecated`

API level: `1+`

`mt.storage` is retained for compatibility with existing scripts.
In new scripts, store immutable values in `local` variables declared outside functions.

| Type | Description |
|---|---|
| `table` | Compatibility storage that becomes read-only after `OnInitialize` completes |

---

<a id="api-mt-polar-offset"></a>

### `mt.polar_offset(angleDegrees, radius)` `Deprecated`

API level: `3+`

Legacy polar-coordinate conversion that uses the angle system’s Y direction.

#### Arguments

| Argument | Type | Unit | Default | Description |
|---|---|---|---|---|
| `angleDegrees` | `number` | degrees | Required | Direction. `0` degrees points right, and the positive direction is clockwise |
| `radius` | `number` | displacement | Required | Distance in that direction |

#### Return Value

| Type | Unit | Description |
|---|---|---|
| `number` | As defined by `radius` | `offsetX` |
| `number` | As defined by `radius` | `screenOffsetY`. Positive downward in screen coordinates |

> [!WARNING]
> **Deprecated. Use `mt.polar_offset_2d`.**
> The arguments are the same as for `mt.polar_offset_2d`, but because the return value uses the angle coordinate system (positive Y points down), its sign had to be reversed before passing it to `offset_y`.
> Forgetting that reversal easily caused only the vertical motion to be inverted, so it has been replaced by `mt.polar_offset_2d`, which returns values in the position coordinate system.
> The behavior has not changed, so existing scripts continue to work unchanged.

#### Example

```lua
-- Old: the caller must reverse the sign
local dx, dy = mt.polar_offset(angle, radius)
character.offset_y = 0.5 - dy

-- New: can be added directly
local dx, dy = mt.polar_offset_2d(angle, radius)
character.offset_y = 0.5 + dy
```

---

<a id="api-mt-layout-retypeset"></a>

### `mt.layout.retypeset(ctx, gap?, config?)` `Deprecated`

API level: `1+`

> [!CAUTION]
> This is an API Level 1 compatibility function. Use `mt.layout.reflow` in new code.

Recalculates character advance in a simplified manner using `geometry.advance_x/y`, while accounting for each character’s individual `scale` and `stretch`.
It does not equalize gaps between visible ink bounds.
Call it after applying per-character size animation, as the final retypesetting operation for the frame.
Rotation, individual pivots, tracking, margins, and transformed outlines are not included in advance calculations.

#### Arguments

| Argument | Type | Unit | Default | Description |
|---|---|---|---|---|
| `ctx` | `table` | — | Required | Context |
| `gap` | `number` | Ratio of canvas width or height | `0.0` | Extra spacing added between advances |
| `config` | `table` | — | `nil` | Realignment settings |
| `config.align` | `string` | — | `"baseline"` | Cross-axis alignment in horizontal writing: `"baseline"`, `"top"`, `"center"`, or `"bottom"` |
| `config.mode` | `string` | — | `"horizontal"` | `"horizontal"` or `"vertical"` |
| `config.targets` | `table` | — | All characters | Array of 1-based character indices to realign. Characters outside the target set are not changed |
| `config.anchor` | `integer` | — | Smallest index in `targets` | Character index whose current position on the advance axis is fixed |
| `config.baseline` | `string` | — | `"anchor"` | `"anchor"` takes the reference line from the current pose; `"natural"` takes it from the natural pose |

With `config.baseline = "anchor"`, changing the anchor character’s `scale` each frame moves the entire line vertically along with the reference line.
`"natural"` fixes the cross axis to the natural position and is suitable when used with a time-varying scale.
`"anchor"` uses the current pose after scale and offset have been applied, while `"natural"` uses the pose from the Base layout with scale 1 and no offset.
The anchor position on the advance axis remains at its current position in either case.
`config.align` is not used by simplified vertical alignment.

#### Return Value

There is no return value.

#### Changes

Directly rewrites `offset_x` and `offset_y` for the target characters.

> [!WARNING]
> **When only some characters are targeted with `targets`, `gap` can cause the target range to collide with adjacent non-target characters.**
> `gap` is added to spacing between characters within the target range on every call, expanding the width of the target range as a whole.
> Because this function never changes coordinates for characters not included in `targets` (that is, it does not automatically make room based on non-target character positions), if an edge of the target range—the first or last character—was originally adjacent to a non-target character, each added `gap` expands the range toward and eventually overlaps that non-target character.
> This is not a problem when all characters are targeted or when sufficient space already exists before and after the target range.
> When targeting only some characters whose boundary is adjacent to another character, set `gap` to `0` or manually provide spacing outside the target range with tracking / margins.

#### Example

```lua
-- Align only characters at indices 3–6, fixing the position of character 3 as the reference and arranging characters on both sides
mt.layout.retypeset(ctx, 0.02, {
    targets = {3, 4, 5, 6},
    anchor = 3,
    align = "baseline"
})
```

---

<a id="api-mt-layout-canvas-to-offset"></a>

### `mt.layout.canvas_to_offset(resolvedGlobal, canvasWidth, canvasHeight, naturalCenterX, naturalCenterY, canvasX, canvasY)` `Deprecated`

API level: `1+`

> [!CAUTION]
> This is an API Level 1 compatibility function. It inverts only the 2D Global transform. Use `mt.layout.place_2d` in new code.

Use this function to calculate the offset that moves the natural center of a character or part to a **target canvas position while accounting for the 2D Global transform**.
`offset_x` / `offset_y` represent displacement from the item’s own natural position and are in the coordinate system **before** the overall `ctx.global` transform (position / rotation / scale / stretch / pivot).
Therefore, assigning target canvas coordinates directly, such as `offset_x = canvasX`, produces the intended screen position only while `ctx.global` has its initial values.
If the whole composition is rotated, moved, or enlarged, the actual position shifts by that transform.
This function cancels the 2D transform of `ctx.global`, then calculates the `offset_x` / `offset_y` corresponding to the target canvas position.

#### Arguments

| Argument | Type | Unit | Default | Description |
|---|---|---|---|---|
| `resolvedGlobal` | `table` | — | Required | `ctx.global` resolved in `OnPreLayout` |
| `canvasWidth` / `canvasHeight` | `number` | px | Required | `ctx.canvas.width` and `ctx.canvas.height` |
| `naturalCenterX` / `naturalCenterY` | `number` | canvas normalized position | Required | Natural center of the target. For characters, `geometry.bounds_center_x/y`; for parts, `geometry.canvas_center_x/y` |
| `canvasX` / `canvasY` | `number` | canvas normalized position | Required | Destination coordinates |

#### Return Value

| Type | Unit | Description |
|---|---|---|
| `number` | canvas normalized displacement | `offsetX` |
| `number` | canvas normalized displacement | `offsetY` |

#### Constraints and Errors

This function inverts only `position_x/y`, `rotation`, `scale`, `stretch_x/y`, and `pivot_x/y`.
It does not invert individual character/part rotation or pivot, the hierarchical transform from an owning character to a part, Global or individual 3D values, camera, projection, or Deform.
Width, height, and `global.scale * stretch_x/y` must be nonzero.

#### Example

```lua
-- Even if 2D ctx.global.rotation / position_x and similar values are changed in OnPreLayout,
-- the natural center reaches (0.8, 0.3) on the canvas when there are no individual/3D/Deform transforms
local geometry = character.geometry
character.offset_x, character.offset_y = mt.layout.canvas_to_offset(
    ctx.global, ctx.canvas.width, ctx.canvas.height,
    geometry.bounds_center_x, geometry.bounds_center_y,
    0.8, 0.3
)
```

#### Notes

For a part, the part’s own transform (`part.offset_x/y`, etc.) is applied **inside** the [resolved transform of its owning character](https://mug-lab-3.github.io/mug-typography-docs/en/scripting/01_concepts#section-inheritance).
Therefore, this function cannot place a part at a fixed canvas position while ignoring the character transform; if the character itself moves, the part moves with it.
To place a part at a fixed canvas position independently of the character transform, first inspect the character’s `offset_x/y` / `rotation` / `scale` and other values, then separately apply their inverse transform to the part’s displacement.

---

<a id="api-mt-layout-set-canvas-position"></a>

### `mt.layout.set_canvas_position(item, canvasX, canvasY, ctx?)` `Deprecated`

API level: `1+`

> [!CAUTION]
> This is an API Level 1 compatibility function. It does not invert a part’s owning-character hierarchy or the target’s own transforms.
> Use `mt.layout.place_2d` in new code.

A helper that writes the `offset_x/y` corresponding to a specified canvas target position `(canvasX, canvasY)` to a character object (`ctx.chars[i]`) or part object (`ctx.parts[i]`).

It uses `geometry.bounds_center_x/y` as the natural center for characters and `geometry.canvas_center_x/y` for parts.
Passing `ctx` as the fourth argument inverts only the same 2D Global transform as `canvas_to_offset`.
Because it does not invert the owning-character transform of a part, 3D, camera, projection, or Deform, it does not guarantee the final screen position when these are active.
When `ctx` is omitted, the natural center matches the target canvas position only when Global is the identity transform.

#### Arguments

| Argument | Type | Unit | Default | Description |
|---|---|---|---|---|
| `item` | `table` | — | Required | Target character or part |
| `canvasX` / `canvasY` | `number` | canvas normalized position | Required | Destination coordinates |
| `ctx` | `table` | — | `nil` | If specified, inverts only the 2D transform of `ctx.global` |

#### Return Value

| Type | Unit | Description |
|---|---|---|
| `number` | canvas normalized displacement | The assigned `offsetX` |
| `number` | canvas normalized displacement | The assigned `offsetY` |

#### Changes

Directly updates the target’s `offset_x` and `offset_y`.

#### Example

```lua
-- Move the character's natural center to the upper-right of the 2D screen (0.8, 0.8)
mt.layout.set_canvas_position(ctx.chars[1], 0.8, 0.8, ctx)

-- Move the part's natural center to the center of the screen when its parent character and Global are identity
mt.layout.set_canvas_position(ctx.parts[1], 0.5, 0.5)
```

---

<a id="api-mt-layout-group-bounds"></a>

### `mt.layout.group_bounds(ctx, targets, targetType?)` `Deprecated`

API level: `1+`

> [!CAUTION]
> This is an API Level 1 compatibility function. It returns an approximation that excludes rotation, pivot, parent characters, and Global.
> Use `mt.layout.measure_bounds_2d` in new code.

Returns **approximate axis-aligned bounds at an intermediate transform stage** for the specified characters or parts.

It applies only each element’s `offset_x/y`, `scale`, and `stretch_x/y` to its natural ink bounds.
It does not account for the element’s rotation/pivot, a part’s owning-character transform, `ctx.global`, 3D, camera, projection, or Deform.
It can therefore be used for supporting calculations in 2D layouts with no rotation or hierarchical/Global transforms, but does not guarantee final rendered bounds, physical bounds, or collision detection.
The public API does not provide a function for obtaining final projected path bounds.
Call it after writing the target elements’ offset/scale/stretch.

#### Arguments

| Argument | Type | Unit | Default | Description |
|---|---|---|---|---|
| `ctx` | `table` | — | Required | Layout context |
| `targets` | `table` | — | Required | Array of 1-based target indices |
| `targetType` | `string` | — | `"character"` | `"character"` or `"part"` |

#### Return Value

| Type | Unit | Description |
|---|---|---|
| `table` | — | Approximate bounds |
| `nil` | — | If there are no valid targets |

The bounds table has the following fields.

| Field | Type | Unit | Description |
|---|---|---|---|
| `left` / `right` / `bottom` / `top` | `number` | canvas normalized position | Approximate bounds at the transform stage described above |
| `center_x` / `center_y` | `number` | canvas normalized position | Center of the group |
| `width` / `height` | `number` | canvas normalized displacement | Width and height of the entire group |

#### Example

```lua
-- Get the bounds of the entire parent-character group at indices 1–3
local bounds = mt.layout.group_bounds(ctx, {1, 2, 3})
if bounds then
    -- Use the center coordinates, width, and height of the whole group to place a background plate or ruby text
    print(bounds.center_x, bounds.center_y, bounds.width, bounds.height)
end
```

---

<a id="api-mt-timeline-intro-outro"></a>

### `mt.timeline.intro_outro(progress, introFraction, outroFraction)` `Deprecated`

API level: `1+`

Separately extracts and returns progress for the first interval (intro) and last interval (outro) from the overall progress.

> [!WARNING]
> **Deprecated**: Percentage-based transitions expand or contract in proportion to clip length, so lengthening the clip makes the fade occur in slow motion.
> Use the fixed-speed `mt.timeline.intro_outro_seconds` instead
> (see the design rules for [`ctx.timeline`](https://mug-lab-3.github.io/mug-typography-docs/en/scripting/02_ctx_reference#section-timeline)).

#### Arguments

| Argument | Type | Unit | Default | Description |
|---|---|---|---|---|
| `progress` | `number` | 0–1 | Required | Overall progress. Normally obtained from `mt.timeline.progress` |
| `introFraction` | `number` | 0–1 | Required | Fraction of the overall duration treated as the intro |
| `outroFraction` | `number` | 0–1 | Required | Fraction of the overall duration treated as the outro |

#### Return Value

| Type | Unit | Description |
|---|---|---|
| `number` | 0–1 | `introProgress`. Intro progress |
| `number` | 0–1 | `outroProgress`. Outro progress |