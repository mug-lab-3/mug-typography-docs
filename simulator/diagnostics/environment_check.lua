-- @MugTypography
-- @duration 4
-- @title Environment Check
-- @author Mug
-- @version 1.0
-- @api_level 3
--[[ @description
Environment diagnostic: confirms the scripting engine (host plugin or MT Sim)
is working and reports the version/capability state currently in effect.
The web simulator runs this script from its Scripting Check menu without
replacing the script being edited.

A failed assert means the installed API does not match what this script
expects (for example an outdated build). Per the atomicity rule
(scripting_api.md section 9.1), a failed assert discards the whole
callback's changes for that frame, so the report or the animation will
simply stop -- check the printed output / error panel for the reason.
]]

local kMinimumApiLevel = 3

function OnInitialize(ctx)
    assert(ctx.meta.api_level >= kMinimumApiLevel,
        "Scripting API level " .. ctx.meta.api_level .. " is older than required (" .. kMinimumApiLevel .. ")")
    assert(#ctx.fonts > 0, "No fonts reported by the host -- font enumeration is broken")

    print("Mug Typography scripting environment check")
    print("  plugin_version         = " .. ctx.meta.plugin_version)
    print("  api_level              = " .. ctx.meta.api_level)
    print("  capabilities.has_3d    = " .. tostring(ctx.meta.capabilities.has_3d))
    print("  limits.max_characters  = " .. ctx.meta.limits.max_characters)
    print("  limits.max_parts       = " .. ctx.meta.limits.max_parts)
    print("  fonts available        = " .. #ctx.fonts)
    print("  canvas                 = " .. ctx.canvas.width .. "x" .. ctx.canvas.height
        .. " (aspect " .. string.format("%.3f", ctx.canvas.aspect_ratio) .. ")")
    print("  (text/font/counts are not available in OnInitialize; see OnPreLayout/OnLayout)")
end

function OnPreLayout(ctx)
    -- Minimal visible motion so a working install shows an animated result,
    -- not just a static frame.
    ctx.global.rotation = mt.wave(ctx.time, 0.15) * 4.0
end

function OnLayout(ctx)
    for index = 1, ctx.char_count do
        local character = ctx.chars[index]
        local progress = mt.distribute(index, ctx.char_count)
        character.offset_y = 0.5 + mt.wave(ctx.time * 0.6 + progress * 2.0, 0.5) * 0.05
        character.fill.use = true
        character.fill.color = mt.color.from_hsv(progress + ctx.time * 0.05, 0.7, 1.0)
    end
end
