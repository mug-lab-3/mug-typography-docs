-- @MugTypography
-- @duration 4
-- @recommend bg #202020
-- @recommend text "ABCD"
-- @title Shadow Overlap Compare
-- @author Mug
-- @version 1.0
-- @api_level 3
--[[ @description
Diagnostic: forces adjacent characters to overlap heavily while each one
carries a different, semi-transparent individual shadow color
(ctx.chars[i].shadow), so the CPU shadow's mask/style-id compositing at
the overlap region can be screenshotted as a baseline before any change to
ShadowStage's two-pass resolution (see the mask+styleId -> single-pass
discussion). Alpha is kept below 1.0 on purpose: an opaque color/opacity
combination takes the DirectOpaqueColors fast path (classifyCpuShadowRender
in ShadowStage.cc), which never goes through the mask+styleId resolution
this diagnostic is meant to exercise. Semi-transparency forces the
MaskAndStyleMap path instead, so effectiveAlpha in resolveShadowColors is
visibly exercised and any double-blending at the overlap boundary would
show up as a visibly too-opaque seam instead of being masked by full opacity.

The recommended text seeds the 4 characters the two pairs below need, so a
fresh scene is comparable across captures without configuring anything by
hand. It is only a starting value: to compare screenshots, keep the text
unchanged, since every index below refers to it.

Layout, left to right:
  pair 1 (chars 1-2): fully static overlap, red vs blue shadow, distance/angle
                       chosen so the shadow itself also overlaps the neighbor.
  pair 2 (chars 3-4): same overlap, but animated (slides in and out of overlap)
                       so a video capture can show the boundary in motion.
All other characters (5+) are pushed off-canvas so only the two pairs are
visible and easy to screenshot/crop.
]]

local kShadowDistance = 3.0
local kShadowAngle = 45.0

-- Alpha < 1.0 on every color: see the OnPreLayout comment above for why this
-- matters (forces the MaskAndStyleMap path instead of DirectOpaqueColors).
local kColorRed = { r = 1.0, g = 0.15, b = 0.1, a = 0.55 }
local kColorBlue = { r = 0.1, g = 0.35, b = 1.0, a = 0.55 }
local kColorGreen = { r = 0.15, g = 0.9, b = 0.25, a = 0.55 }
local kColorYellow = { r = 1.0, g = 0.85, b = 0.1, a = 0.55 }

-- Fraction of a character's own advance width to pull it back by, so it
-- overlaps its predecessor instead of sitting at its natural position.
-- offset_x/offset_y are DISPLACEMENTS normalized to canvas width/height (0.5
-- = no displacement), not to the character's own size, so the pull-back is
-- scaled by each character's own geometry.advance_x rather than a fixed
-- canvas-relative guess (see reference/15_mt_random_noise.lua).
local kOverlapFraction = 0.55

function OnPreLayout(ctx)
    ctx.global.fill.color = { r = 0.92, g = 0.92, b = 0.92, a = 0.7 }
    ctx.global.shadow.enabled = false -- individual colors only; no global fallback shadow.
    ctx.global.shadow.distance = kShadowDistance
    ctx.global.shadow.angle = kShadowAngle
end

function OnLayout(ctx)
    -- mt.wave returns a signed sine wave (range -1..1), so remap it to 0..1
    -- first: this keeps animatedOverlapFraction always positive (always some
    -- overlap, amount breathing over time) instead of swinging into negative
    -- pull-back (which would push characters apart instead of together).
    local animatedPhase = 0.5 + 0.5 * mt.wave(ctx.time, 1.0)
    local animatedOverlapFraction = kOverlapFraction * (0.4 + 0.6 * animatedPhase)

    for index = 1, ctx.char_count do
        local character = ctx.chars[index]
        local pullBack = character.geometry.advance_x * kOverlapFraction
        local animatedPullBack = character.geometry.advance_x * animatedOverlapFraction

        if index == 1 then
            character.shadow.use = true
            character.shadow.color = kColorRed
        elseif index == 2 then
            -- Pull character 2 back onto character 1's natural position.
            character.offset_x = character.offset_x - pullBack
            character.shadow.use = true
            character.shadow.color = kColorBlue
        elseif index == 3 then
            character.shadow.use = true
            character.shadow.color = kColorGreen
        elseif index == 4 then
            -- Pull character 4 back onto character 3, with the overlap
            -- amount animating so a video capture shows the boundary move.
            character.offset_x = character.offset_x - animatedPullBack
            character.shadow.use = true
            character.shadow.color = kColorYellow
        end
    end
end
