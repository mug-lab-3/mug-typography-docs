Target API level: **13**. Lua 5.4 for the Mug Typography plugin.

## 0. Reference lookup

Read Essential contract before generating any script, then the sections and
exact API entries the script uses.

Lookup order:

1. `ctx` reference (Section 13): field types, units, neutral values, axis directions, reference points, and `[R:... W:...]` callback access phases.
2. `mt.*` utility reference (Section 14): signatures and purposes for selecting a function.
3. `mt.*` full reference (Section 15): argument types, units, defaults, permitted enum values, return shapes, and error conditions. Search the API name or jump to its `#### ` heading.

Lookup rules:

1. Read the exact entry instead of guessing enum values, optional defaults, or table shapes, and do not swap in another API to avoid a lookup. Facts absent from this reference are unknown.
2. Precedence: per-field metadata governs field access and units; full function entries govern arguments; the prose governs cross-field behavior and generation policy. Follow that order when statements disagree, and report the disagreement alongside the script.
3. This file is self-contained; ordinary generation needs no companion attachment. An older installed plugin requires its matching reference (see Compatibility).
4. When distribution samples are available, imitate the structure of a nearby one: `samples/reference/` shows individual concepts, `samples/showcase/` complete effects.

## 1. Essential contract

Runtime requirements:

1. Compute each frame from current inputs alone. `ctx` is rebuilt from Inspector values every frame, and frames may be evaluated out of order, so cross-frame accumulation (`x = x + 1`) is invalid. File-scope locals may only pass freshly recomputed values between callbacks within the same frame.
2. Write each field only in its `W:` phase: `OnPreLayout` for `ctx.global`, `ctx.camera`, `ctx.glyphs:declare`, and `ctx.shapes:declare` / `ctx.shape_cameras:declare`; `OnLayout` for `ctx.chars[i]`, `ctx.parts[i]`, `ctx.shapes[i]` (including its `path`), `ctx.shape_cameras[i]`, `ctx.bounding_box`, and `ctx.output`; `OnPath` for `part.path` obtained from `ctx.paths`. Writing outside a `W:` phase raises an error. Counts (`ctx.char_count`, `ctx.part_count`, `ctx.shape_count`) exist only after layout (`OnLayout` / `OnPath`); array indexes start at 1. New scripts omit legacy `OnInitialize`.
3. Keep positions, displacements, and lengths distinct. `offset_*` and `pivot_*` have zero displacement at `0.5`, so `0.0` is a displacement of `-0.5` (half a canvas down/left), not the origin; canvas positions (`ctx.global.position_x` / `position_y`, `ctx.camera.target_x` / `target_y`) have their center at `0.5`. Shadow distance and blur lengths use em (`1.0` = one font size); bounding-box lengths use font-size percent (`100.0` = one font size).
4. Placement coordinates are Y-up; drawing paths (`MtDrawingPath`) and bounding-box fill/stroke Y offsets are Y-down. 2D angles are clockwise-positive (`shadow.angle = 90` points down); negate angles taken from the counterclockwise math convention, and build vectors from an angle with `mt.polar_offset_2d`. Measured post-global coordinates (`mt.layout.measure_bounds_2d`, `mt.layout.get_canvas_position_2d`) go through `mt.layout.place_2d` / `mt.layout.canvas_to_offset_2d` / `mt.layout.pivot_at_2d`, never directly into pre-global `offset_*`.
5. A style's `use` selects an override, not visibility. Set `use = true` in the same callback when supplying an individual `fill`, `stroke`, `shadow`, `texture`, or `blur`, and preserve inherited components via `mt.<group>.resolve` for partial changes. Subobject table assignments merge fields; omitted fields remain unchanged.
6. A callback error aborts the current frame and skips later callbacks. Earlier writes are not guaranteed to be rolled back, but the incomplete frame is never rendered.

Default generation policy (explicit effect requirements may override it):

1. Compose animation over Inspector values: add deltas to position, offset, pivot, rotation, and depth (`z`); multiply scale, stretch, and opacity by factors. Copy originals before multiple writes that need the same baseline. Replace only what the effect drives; when enabling a feature, configure its related parameters, since inactive fields need not hold the effective inherited style.
2. Keep fixed-duration transitions in seconds (`mt.timeline.intro_outro_seconds`, `mt.timeline.remaining`); use clip fractions only for intentionally clip-proportional timing.
3. Preserve 3D projection. Set `ctx.output.force_disable_3d_projection` only for an explicit 2D-only request or an effect that requires 2D output; it overrides all Inspector and keyframed 3D values. Neutral 3D values or 2D-only motion are not reasons; leaving it `false` lets the user add 3D in the Inspector later.
4. Omit deprecated APIs. Declare the target API level (`-- @api_level 13`) in complete new scripts. Add material effects (`texture.type`) only when requested or required by the named material.

```lua
-- RIGHT: motion derived from ctx.time, composed over the current settings
ctx.global.rotation = ctx.global.rotation + ctx.time * 20.0   -- in OnPreLayout
character.offset_y = character.offset_y + math.sin(ctx.time) * 0.05
character.scale = character.scale * (1.0 + math.sin(ctx.time) * 0.1)
character.opacity = character.opacity * fade
character.fill.use = true
character.fill.color = mt.color.lerp_oklab(fromColor, toColor, t)

-- WRONG if cumulative motion was intended: this is always Inspector + 1
ctx.global.rotation = ctx.global.rotation + 1.0

-- WRONG if "no offset" was intended: shifts down half a canvas (neutral is 0.5)
character.offset_y = 0.0

-- WRONG: ignored because character.fill.use is false
character.fill.color = { r = 1.0, g = 0.2, b = 0.2, a = 1.0 }
```

## 2. Callbacks

All callbacks are optional. `OnInitialize(ctx)` runs once at script load (legacy; omit in new scripts). Writes: `mt.storage` (deprecated). Reads: only `ctx.canvas`, `ctx.fonts`, `ctx.meta`, `ctx.inputs`. On error: frame evaluation does not start.

Every frame, in order:

1. `OnPreLayout(ctx)`:
   - Writes: `ctx.global`, `ctx.camera`, custom glyph declarations (`ctx.glyphs:declare`), shape declarations (`ctx.shapes:declare`), shape camera declarations (`ctx.shape_cameras:declare`).
   - Reads: `ctx.time`, `ctx.frame`, `ctx.fps`, `ctx.canvas`, `ctx.fonts`, `ctx.timeline`, `ctx.meta`, `ctx.inputs`, `ctx.global`, `ctx.camera`.
   - Unavailable: `ctx.char_count`, `ctx.part_count`, `ctx.shape_count`, `ctx.chars`, `ctx.parts`, `ctx.font`, `ctx.bounding_box`, `ctx.output`, `ctx.paths`.
   - On error: frame aborted; `OnLayout` and `OnPath` skipped.
2. Layout generation (engine internal):
   - Text is shaped and laid out using finalized `ctx.global` and `ctx.glyphs`. Character, part, and shape counts (`ctx.char_count`, `ctx.part_count`, `ctx.shape_count`) and font metrics (`ctx.font`) become final here.
3. `OnLayout(ctx)`:
   - Writes: `ctx.chars[i]`, `ctx.parts[i]`, `ctx.shapes[i]` (including in-place edits on `ctx.shapes[i].path`), `ctx.shape_cameras[i]`, `ctx.bounding_box`, `ctx.output`.
   - Reads: all `OnPreLayout` readable fields (now read-only for `ctx.global` and `ctx.camera`), plus `ctx.char_count`, `ctx.part_count`, `ctx.shape_count`, `ctx.font`, `ctx.chars[i]`, `ctx.parts[i]`, `ctx.shapes[i]`, `ctx.shape_cameras[i]`, `ctx.bounding_box`, `ctx.output`.
   - On error: frame aborted; `OnPath` skipped.
4. `OnPath(ctx)`:
   - Writes: `part.path` on parts obtained lazily from `ctx.paths:part`, `ctx.paths:character`, `ctx.paths:shape`, or `ctx.paths:select`.
   - Reads: finalized layout and transform fields, plus `ctx.paths`.
   - On error: frame aborted.
5. Render.

Later callbacks read what earlier ones finalized but cannot write it back: `ctx.global` and `ctx.camera` are read-only in `OnLayout` and `OnPath`. The per-field `[R:... W:...]` markers in Section 13 are authoritative. Iterate with `ctx.char_count` / `ctx.part_count` (or `mt.each_char` / `mt.each_part`); never assume a fixed character count, part count, or glyph shape.

### Passing values between callbacks

Use a file-scope local only for a value a later callback can no longer read, such as an Inspector value that `OnPreLayout` replaces. Overwrite it from current inputs every frame before reading it. Values readable in every phase, such as `ctx.inputs`, are read directly where they are used.

```lua
local scaleKnob = 1.0

function OnPreLayout(ctx)
    scaleKnob = math.max(ctx.global.scale, 0.05)   -- overwritten every frame
    ctx.global.scale = 1.0
end

function OnLayout(ctx)
    local travel = 0.07 * scaleKnob
    for index = 1, ctx.char_count do
        local character = ctx.chars[index]
        character.offset_y = character.offset_y + travel
    end
end
```

## 3. Inspector composition and style inheritance

`fill`, `stroke`, `shadow`, `texture`, and `blur` resolve in three tiers:

1. `global`: finalized in `OnPreLayout` (`ctx.global.*`).
2. `character`: `character.<style>.use == true` takes the character value; otherwise inherits the `global` value.
3. `part`: `part.<style>.use == true` takes the part value; otherwise inherits the value chosen at the `character` tier.

Shapes (`ctx.shapes[i]`) inherit from `ctx.global.*` and override with `shape.<style>.use = true` in `OnLayout`.

Opacity multiplies across tiers without a `use` flag: `global.opacity * character.opacity * part.opacity` (for shapes: `global.opacity * shape.opacity`). Transform fields (`offset_*`, `pivot_*`, `scale`, `stretch_*`, `rotation`, `z`, `yaw`, `pitch`) also have no `use` flag and always compose across tiers.

### Individual style overrides

An individual style has no effect while `use` is `false`; set `use = true` and the style fields in the same callback:

```lua
character.fill.use = true
character.fill.color = mt.color.from_okhsv(index / ctx.char_count, 0.8, 1.0)
```

Style inheritance and partial-override rules:

- `gradient`: `gradient.color_space ~= "none"` fills only regions where both character and part `fill.use` are `false`. Setting `fill.use = true` on a character or part replaces the gradient on that element with its solid `fill.color`.
- `global.fill.transparent`: when `true`, hides the inherited fill and removes it from the shadow's silhouette, so the shadow comes from the stroke alone. Characters and parts with `fill.use = true` still draw their individual fill and cast its shadow.
- Script-only fields (no Inspector parameter group backs them): `part.stroke`, `part.shadow`, `part.yaw`, `part.pitch`, and character/part/shape `texture` and `blur` start with `use = false` and default values every frame unless set by the script. Furthermore, `character.shadow.blur_x`, `character.shadow.blur_y`, and `character.shadow.glow` are script-only and read as the frame's global shadow blur/glow until a script sets them.
- `shadow.use`: switches shadow `color`, `blur_x`, `blur_y`, and `glow` together as one bundle, and casts a shadow on that element even while `ctx.global.shadow.enabled` is `false`. `distance` and `angle` exist only on `ctx.global.shadow`.
- `blur.use`: switches text blur `amount_x`, `amount_y`, and `glow` together, independently of `shadow.use`. Text `blur` blurs the glyph body (fill, gradient, texture, stroke, crayon) and never blurs the shadow.
- `stroke.use`: switches `width`, `gap`, `color`, `outer_width`, and `outer_color` together. `order`, `join`, and `miter_limit` exist only on `ctx.global.stroke`. `outer_width` is active only while inner `width > 0`.
- `mt.color.resolve_fill`, `mt.shadow.resolve`, `mt.blur.resolve`, `mt.stroke.resolve`, and `mt.texture.resolve`: return the effective resolved style for a character or part. Passing `{ level = "global" | "character" | "part" }` stops inheritance at that tier. To override only one field of a multi-field style bundle (e.g. changing only `shadow.glow` on a character while keeping its inherited shadow color and blur), resolve the parent tier (`{ level = "global" }` for a character, or `{ level = "character" }` for a part), set `use = true`, and write back the resolved table with the modified field:

```lua
local inheritedShadow = mt.shadow.resolve(ctx, character, { level = "global" })
character.shadow = {
    use = true,
    color = inheritedShadow.color,
    blur_x = inheritedShadow.blur_x,
    blur_y = inheritedShadow.blur_y,
    glow = 0.5,
}
```

Assigning a table to any subobject (`ctx.global.shadow`, `character.fill`, `character.stroke`, `character.shadow`, `character.texture`, `character.blur`, etc.) merges per field; omitted fields remain unchanged:

```lua
ctx.global.shadow = { enabled = true, distance = 0.12 }   -- other shadow fields unchanged
```

### Text glow

- `blur.glow` lifts the blurred text into a glow using the same formula as `shadow.glow`: gain `1 + 10 * glow`, with each RGBA channel clamped at `1.0`. It acts only while the text is blurred (`amount_x > 0` or `amount_y > 0`).

### Respect the inspector

Inspector-backed fields start each frame at the user's Inspector values; script-only overrides start unused with defaults. Write what the animation drives and read what it only needs: a field assigned a constant every frame is a control taken from the user.

```lua
-- WRONG: the inspector's gradient color no longer does anything
ctx.global.gradient.end_color = { r = 1.0, g = 0.46, b = 0.14, a = 1.0 }

-- CORRECT: animate the position, read the color the user chose
ctx.global.gradient.start_position = heatEdge
local glowColor = ctx.global.gradient.end_color
```

`ctx.global.fill.color`, `ctx.global.gradient.end_color`, and `mt.color.resolve_fill` report resolved values, so build on the user's palette instead of restating a literal. Nudge values relative to the current one: `ctx.global.tracking = ctx.global.tracking - strain * 0.05`.

## 4. Coordinates and transforms

Every numeric field in the `ctx` reference carries `unit=`, and where meaningful `neutral=`, `axis=`, `range=`, and `base=`.

Unit vocabulary:

- `canvas_ratio_position`: absolute canvas position; `0.5` = canvas center (`(0, 0)` is bottom-left, `(1, 1)` is top-right); X is normalized by canvas width, Y by canvas height (`axis=y_up`). Fields: `ctx.global.position_x` / `position_y`, `ctx.camera.target_x` / `target_y`, `ctx.shape_cameras[i].target_x` / `target_y`, and `geometry.*` canvas coordinates (`canvas_origin_*`, `vertical_origin_*`, `bounds_center_*`, `canvas_center_*`).
- `canvas_ratio_displacement`: displacement from a reference point; `neutral=0.5` means zero displacement (`value - 0.5` is the signed displacement fraction of canvas width/height; Y is `axis=y_up`). Fields: `ctx.global.pivot_x` / `pivot_y`, and character/part/shape `offset_*` and `pivot_*`.
- `canvas_ratio_length`: signed or unsigned distance as a fraction of canvas width or height; `neutral=0.0` (no `0.5` bias). Fields: `ctx.font.em_size` / `ascent` / `descent` / `line_height`, `geometry.bounds_width` / `bounds_height` / `advance_*` / `local_center_*`, character/part/shape `z` (`axis=z_into_screen`, positive is deeper/away from camera), and camera `lens_shift_*`.
- `em`: `1.0` = one font size (`neutral=0.0`). Fields: `ctx.global.tracking`, `ctx.global.margins`, `ctx.global.emoji.offset_x` / `offset_y`, `stroke.width` / `gap` / `outer_width`, `shadow.distance` / `blur_x` / `blur_y`, and `blur.amount_x` / `amount_y`.
- `font_size_percent`: `100.0` = one font size (`px = value * fontSizePx / 100`). Fields: `ctx.bounding_box.width` / `margin_*` / `corner_radius` / `fill_offset_*` / `stroke_offset_*`. Note that `margin_y` is `axis=y_up`, whereas `fill_offset_y` and `stroke_offset_y` are in drawing space (`axis=y_down`, positive moves downward).
- `multiplier`: scale factor where `neutral=1.0` leaves size unchanged. Fields: `ctx.global.line_spacing`, `scale`, `stretch_x`, `stretch_y`, `camera.zoom`, `ctx.global.emoji.scale`, `ctx.global.stroke.miter_limit`.
- `unit_interval`: `0.0`–`1.0` normalized value (`opacity` has `neutral=1.0`; `progress`, `midpoint`, `write_on_start`, `write_on_end`, and `color` channels range `0.0`–`1.0`).
- `degrees`: angle in degrees (`neutral=0.0`). 2D rotations and angles are `axis=clockwise_positive`.
- `path_units`: normalized local outline coordinates where `1000` units = `1.0` em (`axis=y_down` for paths: positive X is right, positive Y is down).
- `font_design_units`: font-native design units (`ctx.font.units_per_em`, conversion factor only).
- `perspective_strength`: `0.0`–`1.0` camera perspective strength (`distancePx = f(perspective) * canvas.height`; larger = camera closer / stronger perspective).
- `gradient_position`: ratio along the gradient angle across the transformed text bounding box (`0.0`–`1.0` spans edge to edge).
- `ratio`: aspect ratio (`ctx.canvas.aspect_ratio = width / height`, `ctx.canvas.pixel_aspect_ratio`).
- `px`, `seconds`, `frames`, `fps`: literal physical/time units.
- `unitless`: dimensionless scalar (`ctx.inputs.numbers`, `z_index`, `shadow.glow`, `blur.glow`, `texture.p1`–`p4`).

### Length units

`shadow.distance`, `shadow.blur_x` / `blur_y`, and `blur.amount_x` / `amount_y` are in em, measured on each part, so they stay proportional to the glyph under scale, stretch, rotation, and perspective. `ctx.bounding_box.*` lengths are font-size percent (`px = value * fontSizePx / 100`).

```lua
ctx.global.shadow.distance = 0.12   -- RIGHT: 0.12 em (useful range 0.05-0.3)
ctx.global.shadow.distance = 12     -- WRONG: clamped to 10 em, ten font sizes away
```

`shadow.glow` and `blur.glow` are not lengths: they are unitless strengths from `0` to `10` (clamped on write), where `0` means no glow.

### Shadow glow

- `shadow.glow` brightens the blurred shadow into a glow. It acts only on a blurred shadow: while `blur_x` and `blur_y` are both `0` it changes nothing, and a sigma below a quarter pixel counts as `0`.
- It multiplies the blurred shadow's color and alpha by `1 + 10 * glow` and clamps each channel at full (`1.0`). Glow `0.1` multiplies by `2`, `0.5` by `6`, and `1.0` by `11`.
- A faint halo becomes denser, and the bright region grows outward, because it reaches as far as the blurred alpha still exceeds `1 / (1 + 10 * glow)`. Raising `glow` widens the bright region instead of only brightening it.
- Where a channel reaches full first, the others keep rising, so a strongly lifted core turns toward white, and a shadow color with one dominant channel shifts through lighter hues on the way.
- The glow is part of the shadow: it is drawn under the text, follows the shadow offset (`distance = 0` centers it on the text), and leaves the text itself alone.
- It draws over the background rather than lighting it up, so a light glow over a light background has little contrast.
- Character and part `shadow.glow` follow `shadow.use`, like the shadow color and blur: set `use = true` in the same callback or the value is ignored.

Values that read as a glow around text (judged on bold strokes about `0.14` em thick, on a dark background, with `distance = 0` and a saturated shadow color over white text):

- `blur_x = 0.06`, `blur_y = 0.06` em keeps the letter shapes and spreads the light just outside the strokes. Use this blur for an ordinary glow.
- With that blur, `glow = 0.2` is a faint glow, `0.4` a clear one, and `0.8` a strong one.
- Past that, the glow floods the gaps: a wider blur or a `glow` above `0.8` fills counters such as the hole of an "o" and merges neighbouring strokes into a block.

### Pivot reference points

A pivot is measured from the item's own reference point, never from the canvas, so never assign a `geometry.*` canvas coordinate to `pivot_*`:

- `ctx.global.pivot_x` / `pivot_y`: displacement from `ctx.global.position_x` / `position_y` (`0.5` = zero displacement).
- `character.pivot_*`: displacement from the character's natural ink-bounds center (`character.geometry.bounds_center_*`).
- `part.pivot_*`: displacement from the part's natural position (`part.geometry.canvas_center_*`).
- `ctx.shapes[i].pivot_x` / `pivot_y`: displacement from the shape position (the path origin).

To rotate or scale a character around an edge or baseline, either call `mt.layout.pivot_at_2d(ctx, character, anchor)` (which sets the pivot to a semantic anchor such as `"bottom"`, `"top"`, `"left"`, `"right"`, `"baseline"`, or `"typesetting_origin"` and automatically adjusts `offset_*` so the current pre-3D pose does not shift), or displace `pivot_*` manually from `0.5` by half its size (`bounds_width` / `bounds_height` share the pivot's canvas-normalized unit):

```lua
local geometry = character.geometry
character.pivot_y = 0.5 - geometry.bounds_height * 0.5   -- bottom edge
character.pivot_y = 0.5 + geometry.bounds_height * 0.5   -- top edge
character.pivot_x = 0.5 - geometry.bounds_width  * 0.5   -- left edge
```

```lua
-- WRONG: the pivot is dragged away from the part, so rotation orbits it
part.pivot_x = part.pivot_x + flight.x
part.pivot_y = part.pivot_y + flight.y
part.offset_x = part.offset_x + flight.x
part.offset_y = part.offset_y + flight.y

-- RIGHT: leave the pivot alone; the part turns about itself while it flies
part.offset_x = part.offset_x + flight.x
part.offset_y = part.offset_y + flight.y
part.rotation = part.rotation + flight.rotation
```

If something travels in a circle instead of a line or arc, check for a written pivot first.

### Transform composition order

Each level applies its fields to geometry in this order:

1. Subtract the pivot.
2. Apply `scale` and `stretch_*`.
3. Apply `pitch`, `yaw`, then `rotation`.
4. Add the pivot.
5. Add the offset (including `z`).
6. Add the natural position.

At the character level the natural bounds center is folded into the pivot term. The order is the same with or without 3D projection. Levels nest outward (`part` inside `character` inside `global`), so each level's pivot and rotation apply to everything beneath it. Consequences:

- `offset_*` is outside the level's own rotation: it is never rotated by that level's `rotation`, and the pivot travels with the item, so moving an item never requires touching its pivot.
- `pivot_*` matters only when non-neutral: at `0.5` the subtraction and addition cancel and the item rotates and scales about itself; otherwise the pivot is a lever arm for every rotation and scale at that level.
- `scale` and `stretch_*` are inside the rotation: they act along the item's own local axes, not the canvas axes.
- Changing a pivot when rotation or scale is non-neutral shifts the item: call `mt.layout.pivot_at_2d(ctx, item, anchor)` to move a character/part pivot while compensating `offset_*` to preserve its current pose.

### Measure layout instead of assuming it

Inspector `ctx.global.scale`, `tracking`, `line_spacing`, `h_align` / `v_align`, and `margins` move the glyphs before `OnLayout` runs. Place, align, and space characters from measurements — `mt.layout.measure_bounds_2d`, `geometry.*`, and the canvas-normalized `ctx.font.em_size` / `ascent` / `descent` / `line_height` — and express distances that should follow the glyphs in those terms rather than as fixed canvas fractions. (`ctx.font.units_per_em` is a font design-unit conversion factor, not a canvas distance.)

### Moving something to a measured position

 Distinguish pre-global and post-global coordinate spaces:

- Pre-global space (before `ctx.global` scale, stretch, rotation, and position): `character.geometry.*`, `part.geometry.*`, `ctx.font.*`, and `character.offset_*` / `part.offset_*`. Pre-global deltas (such as `ctx.font.line_height` or `character.geometry.advance_x`) can be added directly to `offset_*`; `ctx.global.scale` and `ctx.global.rotation` then transform them automatically (multiply by `ctx.global.stretch_x` / `stretch_y` only if you want to follow global stretch).
- Post-global space (after the complete `global` -> `character` -> `part` 2D hierarchy, before 3D projection and deformation): `mt.layout.measure_bounds_2d` and `mt.layout.get_canvas_position_2d`. Never write a post-global delta directly into `offset_*` (it would be scaled and rotated a second time by `ctx.global`). Always apply post-global positions through `mt.layout.place_2d(ctx, item, canvasX, canvasY)` or `mt.layout.canvas_to_offset_2d(ctx, item, canvasX, canvasY)`:

```lua
-- Align a run so its right edge lands on targetX.
local deltaX = targetX - mt.layout.measure_bounds_2d(ctx, run).right
for _, index in ipairs(run) do
    local item = ctx.chars[index]
    local canvasX, canvasY = mt.layout.get_canvas_position_2d(ctx, item)
    mt.layout.place_2d(ctx, item, canvasX + deltaX, canvasY)
end
```

When measuring text bounds to place a decoration or frame that should rotate together with `ctx.global.rotation`, pass `"before_global_rotation"` as the fourth argument (`mt.layout.measure_bounds_2d(ctx, targets, "character", "before_global_rotation")`), which removes `ctx.global.rotation` around the global position+pivot while keeping `ctx.global.scale` and `stretch_*`. To compare pre-global metrics (`geometry.*`, `ctx.font.*`) with `measure_bounds_2d`, multiply the pre-global values by `ctx.global.scale` (and `ctx.global.stretch_x` / `stretch_y`).

### Angles in detail

- `rotation` (2D, on `global`, `character`, `part`, `shape`): positive is clockwise (`90` turns what pointed up `+Y` to point right `+X`). When computing a heading from Y-up coordinates via `math.deg(math.atan(dy, dx))` (which is counterclockwise-positive), negate the angle before assigning to `rotation`, or use `path:at_distance(ratio)` from `mt.path.arc_length`, which already returns headings in clockwise screen convention.
- `mt.polar_offset_2d(angleDegrees, radius)`: takes a clockwise angle (`0` = right `+X`, `90` = down `-Y`, `-90` = up `+Y`) and returns `dx, dy` in Y-up canvas offset units, ready to add to `offset_x` and `offset_y`.
- Object `yaw` / `pitch` (`ctx.global`, `ctx.chars[i]`, `ctx.parts[i]`, `ctx.shapes[i]`): rotate the object about its own pivot. Positive `yaw` turns the right edge toward the viewer (`-Z`); positive `pitch` turns the top edge toward the viewer (`-Z`).
- Camera `yaw` / `pitch` (`ctx.camera`, `ctx.shape_cameras[i]`): orbit the camera around `target_x` / `target_y`. Positive `yaw` moves the camera to the right of the target (so the subject appears to turn left); positive `pitch` moves the camera up (looking down at the subject).
- `ctx.global.gradient.angle`: `0` runs left to right (`+X`), positive rotates clockwise (`90` = top to bottom, `-90` or `270` = bottom to top).
- `ctx.global.shadow.angle`: `0` casts right (`+X`), positive rotates clockwise (`90` = straight down).

### Aspect ratio

Because X is normalized by canvas width and Y by canvas height, equal numeric deltas in X and Y are not equal pixel distances on a non-square canvas. For circular or radial falloffs use `mt.layout.radial_distance(ctx, x, y, centerX, centerY)`, which corrects for canvas aspect ratio. For manual directional math, multiply X differences by `ctx.canvas.aspect_ratio` (and `ctx.canvas.pixel_aspect_ratio` for non-square pixels), or divide X radius by `ctx.canvas.aspect_ratio` when laying out a circle in canvas coordinates.

### Reflow after character scaling

Changing `character.scale` or `character.stretch_*` does not update character advances, so scaled characters overlap or leave gaps. Call `mt.layout.reflow(ctx, gap?, config?)` after modifying character scales/stretches instead of computing advances by hand; it re-typesets from exact horizontal or vertical typesetting origins while preserving shaped spacing, tracking, and margins.

```lua
function OnLayout(ctx)
    for index = 1, ctx.char_count do
        local character = ctx.chars[index]
        character.scale = character.scale * (0.8 + index * 0.05)
    end
    mt.layout.reflow(ctx)   -- recompute advances for the new sizes
end
```

## 5. Time and transitions

Timing selection guide:

- Fixed-duration intro and outro: `local intro, outro = mt.timeline.intro_outro_seconds(ctx, introSeconds, outroSeconds, fallbackDuration?)`. Returns `intro` (`0` -> `1` over the first `introSeconds`) and `outro` (`0` -> `1` over the last `outroSeconds`). Requested durations compress proportionally only when `introSeconds + outroSeconds` exceeds the clip duration.
- Remaining time until clip end: `mt.timeline.remaining(ctx, fallbackDuration?)` returns remaining seconds.
- Local time window: `mt.timeline.window_progress(ctx, startSeconds, durationSeconds)` returns clamped `0`–`1` linear progress inside `[startSeconds, startSeconds + durationSeconds]`. `mt.timeline.window_ctx(ctx, startSeconds, durationSeconds)` returns a derived `ctx` remapped to that window.
- Multi-stage sequential choreography: `mt.timeline.chain(ctx, initialValue, segments, options?)` evaluates pure-function stage segments sequentially (each segment receives `(segmentCtx, previousValue)` and can be an active `{ duration = ..., run = function(segCtx, state) ... end }` or a hold `{ hold = "remaining" | seconds }`), passing each completed segment's final return value to the next.
- Piecewise keyframe curves: `mt.keyframes(keys, time)` interpolates numeric or RGBA color keyframe tables `{ { t = 0.0, v = 0.0, ease = "out_cubic" }, { t = 1.0, v = 1.0 } }`.

### Filtered and staggered intro/outro

`mt.each_char(ctx, options?)` and `mt.each_part(ctx, options?)` supply filtering (`from`, `to`, `from_char`, `to_char`, `line`), ordering (`order = "asc" | "desc" | "center" | "random"`, `seed`), and a reusable `info` table (`progress`, `n`, `count`, `first`, `last`, plus `char`, `char_index`, `index_in_char` on `mt.each_part`). Note that `info` is reused across iterations — copy fields out if you need to store them. Pass `info.progress` into `mt.stagger_progress(progress, info.progress, span)` (where `span` in `0.0`–`1.0` controls overlap and guarantees every element finishes at `progress == 1.0`). For time-based stagger by index, use `mt.stagger(time, index, delay, duration)` or `mt.stagger_pattern(time, index, count, pattern, delay, duration, seed?)`. Seed random ordering or random stagger with `ctx.meta.instance_seed` so multiple clip instances do not repeat the identical random pattern:

```lua
local options = { order = "random", seed = ctx.meta.instance_seed }
for _, character, info in mt.each_char(ctx, options) do
    -- same body as the Complete example
end
```

## 6. Colors, gradients and textures

A color is `{ r = 1.0, g = 0.5, b = 0.0, a = 1.0 }`, each component `0.0`–`1.0`. Partial assignment merges with the current value; unknown keys raise an error.

```lua
character.fill.color = { a = 0.5 }        -- keeps r/g/b, changes alpha only
character.fill.color.a = character.fill.color.a * 0.5
```

RGBA is the storage format. Calculate derived colors in the OKLab perceptual family:

- Blending two colors: `mt.color.lerp_oklab(from, to, t)` — perceptually uniform, no muddy midpoint.
- Hue travel / rainbow transitions: `mt.color.lerp_oklch(from, to, t, hueMethod?)` — shortest hue path by default; pass `"long"` as the 4th argument to travel the long way around the hue wheel (`lerp_oklab` may pass near the neutral axis).
- Per-character hue sequences: `mt.color.from_oklch(lightness, chroma, hueDegrees, alpha?)` or `mt.color.from_okhsl(hue01, saturation01, lightness01, alpha?)`.
- Modifying one perceptual component of an existing color: decompose with `mt.color.to_oklch(color)` / `to_okhsl(color)` / `to_oklab(color)`, adjust the field, and rebuild with `from_oklch` / `from_okhsl` / `from_oklab`.
- Lightness adjustments (tinting toward white or black): use `mt.color.from_okhsl` / `to_okhsl`, where `lightness = 1.0` is pure white and `0.0` is black. Do not use OKHSV for lightness: in `from_okhsv` / `to_okhsv`, `value = 1.0` is the most vivid saturated color, not white; use OKHSV only when HSV-like value semantics are wanted, and always prefer `from_okhsv` over compatibility-only `from_hsv`.
- `mt.color.lerp`: use only for exact linear sRGB channel interpolation or alpha-only changes (`mt.color.with_alpha(color, alpha)` copies a color with a new alpha).

```lua
character.fill.color = mt.color.lerp_oklab(fromColor, toColor, t)
character.fill.color = mt.color.lerp_oklch(redColor, blueColor, t)
```

### Gradient coordinates

`ctx.global.gradient.start_position` and `end_position` are not canvas coordinates; they are ratios along the `angle` direction across the whole text's bounding box *after* transforms:

- `0.0` / `1.0` spans edge to edge of the transformed text bounding box; `0.2` / `0.8` starts 20% inward from each edge.
- `angle = 0` runs left-to-right (`+X`), `90` top-to-bottom, `-90` (or `270`) bottom-to-top.
- `ctx.global.fill.color` sits at `start_position` and `ctx.global.gradient.end_color` at `end_position`; setting `start_position > end_position` reverses the ramp (equivalent to rotating `angle` by `180`).
- Under 3D projection, the bounding box is the projected canvas-space text bounds (updated by camera and pose changes), while `angle` stays aligned to the 2D canvas axes, so Z rotation moves the text through the gradient rather than rotating the gradient axis.
- `ctx.global.gradient.color_space` values: `"none"`, `"oklab"`, `"oklch_short"`, `"oklch_long"`, `"okhsl"`, `"okhsv"`, `"linear_rgb"`, `"crayon"`.

### Textures

A texture states what the letters are made of. **Choose one only when the user asked for that look or named a material**; a request to move, time, or arrange text is not a reason to add one. `"none"` is the default and is usually right.

`texture.p1`–`p4` are material control slots whose meaning depends on `texture.type`, in order `p1`, `p2`, `p3`, `p4`:

- `water_droplet`: `p1` = thickness, `p2` = roundness, `p3` = gloss, `p4` = light angle (degrees).
- `air_cushion`: `p1` = inflation, `p2` = seal width, `p3` = wrinkles, `p4` = light angle (degrees).
- `glitter`: `p1` = flake size (`0` removes flakes), `p2` = highlight ratio (`0` lights none, `1` lights all, placement fixed), `p3` = flake amount (`0` removes all flakes and glow, `1` full density; remaining flakes keep positions and colours), `p4` = light angle (degrees). `texture.color` is the metal colour; hue spread is fixed at full range around it. Lit flakes have a bright core and soft glow within the text outline.
- `iridescent`: `p1` = film thickness, `p2` = hue range, `p3` = strength, `p4` = light angle (degrees). Ignores `texture.color`.
- `faceted`: `p1` = facet count, `p2` = bevel depth, `p3` = polish, `p4` = light angle (degrees).
- `stained_glass`: `p1` = piece size (relative to untransformed character), `p2` = lead width (`0` removes lead), `p3` = hue range (spreads from the fill colour underneath), `p4` = glow (`0.0`–`1.0`: `0.5` is plain glass, above `0.5` emits light, **below `0.5` darkens toward `0`**). `texture.color` is **the lead colour**.
- `metallic`: `p1` = polish (`0` matte, `1` mirror), `p2` = relief, `p3` = reflection contrast, `p4` = light angle (degrees). Takes the metal colour from the **fill** and uses `texture.color` as the light colour.
- `metallic_2`: `p1` = polish (`0` matte, `1` mirror), `p2` = relief, `p3` = exposure (`0.5` is neutral studio brightness), `p4` = light angle (degrees). Takes the metal colour from the **fill** and uses `texture.color` as the light colour.

Slot values `p1`–`p3` (and `stained_glass` `p4`) are `0.0`–`1.0` (clamped when drawn); light angles in `p4` are in degrees and wrap around (which is why the field reference marks `p1`–`p4` as `unitless`). Unless noted above, `texture.color` tints the light added on top of the fill (white leaves it untinted). On a character, part, or shape, set `texture.use = true` or the inherited texture stays.

## 7. Paths, text and drawing order

### Choosing between Characters, Parts, Custom Glyphs, and Shapes

Mug Typography provides four visual element types. Pick the one that matches the role of the element:

1. `ctx.chars[i]` (Shaped text characters):
   - Created automatically by shaping `ctx.global.text` (up to `ctx.meta.limits.max_characters`).
   - Affected by `ctx.global` transforms, `ctx.camera` 3D projection, `mt.layout.reflow`, `mt.layout.measure_bounds_2d`, `mt.layout.pivot_at_2d`, `mt.layout.match_pose`, Write-On, Gradient, Bounding Box, Inspector Deform, Crayon, and `ctx.output.manual_order_text`.
   - Note: `character.z_index` is ignored on text characters (use `ctx.output.manual_order_text` for 2D text draw order, or `ctx.chars[i].z` / `ctx.parts[i].z` for 3D depth).
2. `ctx.parts[i]` (Sub-character glyph components):
   - Created automatically from each character's decomposed solid contours (holes stay attached to their owning solid; up to `ctx.meta.limits.max_parts`).
   - Nested inside `ctx.chars[i]` (`i = part.character_index`); inherits transform and style from its owning character.
   - Reached via `mt.each_part(ctx)` or `character.part_start` / `character.part_count` in `OnLayout`, and via `ctx.paths` in `OnPath` for outline point editing (`part.path:map_points`, `set_svg`, etc.).
3. `ctx.glyphs:declare` (Custom glyphs inserted into `ctx.global.text`):
   - Declared in `OnPreLayout` and concatenated into `ctx.global.text`. Becomes an ordinary `ctx.chars[i]` / `ctx.parts[i]` element (consumes a character and part slot).
   - Follows `ctx.global` transforms and `ctx.camera`, participates in Write-On, Gradient, Bounding Box, Deform, Crayon, `mt.layout.measure_bounds_2d`, `mt.layout.match_pose`, and `ctx.output.manual_order_text`.
   - Use when a custom vector symbol must flow inline with text, rotate with `ctx.global.rotation`, or participate in text-only effects (such as Write-On or Deform).
4. `ctx.shapes:declare` (Standalone shapes apart from the text):
   - Declared in `OnPreLayout` (up to `ctx.meta.limits.max_shapes` = 1024; uses **zero** character or part slots, works even when `ctx.global.text == ""`).
   - Drawn in `"back"` (behind all text) or `"front"` (in front of all text), ordered within its layer by `shape.z_index`.
   - Supports parent-child transform hierarchies (`parent = earlierShapeNumber`) for jointed rigs/trees, and dedicated 3D cameras (`ctx.shape_cameras:declare()`).
   - **Ignores** `ctx.global` 2D/3D transforms and `ctx.camera` (a zero `ctx.global.scale` does not hide shapes), and is skipped by Write-On, Gradient, Bounding Box, Deform, Crayon, and `manual_order_text`. Inherits global appearance (`fill`, `stroke`, `shadow`, `blur`, `texture`), overridable via `shape.<style>.use = true`.
   - Use for backgrounds, screen frames, particles, gauges, and jointed character scenes that should not consume character slots or shift text layout.

### Inspector text and line breaks

Inspector text is interpreted once before `OnPreLayout`: `\n` and `<br>` forms and CRLF become LF; escaped `\\n` and `\<br>` remain literal `\n` and `<br>`. `ctx.global.text` receives the result. Script-written text is not decoded again, so use actual LF (`"\n"`). Custom glyphs are inserted before shaping; line breaks are excluded from `ctx.chars`.

### Methods are called with a colon

`ctx.paths`, `ctx.glyphs`, `ctx.shapes`, `ctx.shape_cameras`, `MtArcLengthPath` (`path:length()`, `path:at_distance()`), and `MtDrawingPath` (`path:clear()`, `path:move_to()`, etc.) members are **methods**; calling them with a dot fails at runtime.

```lua
local parts = ctx.paths:select("c1, p8-10, !p9")   -- RIGHT
local parts = ctx.paths.select("c1")               -- WRONG
path:move_to(0, 0)                                 -- RIGHT
```

### Part selector grammar

`ctx.paths:select(selector)`: `c` = character number, `p` = global part number, a bare number = part number, `!` = exclude; commas or spaces separate conditions. Ranges like `c3-5` / `p8-10` are inclusive, and a bare endpoint takes the other endpoint's prefix. Exclusions apply wherever they appear, and a selector with only exclusions selects nothing. Results come in ascending part order; selecting the same part twice in a frame returns the same mutable object.

`mt.target.chars(ctx, spec, options?)` / `mt.target.parts(ctx, spec, options?)` (`OnLayout` / `OnPath`, API level 13) resolve the same grammar to ascending integer arrays for `ipairs`. `chars` returns character numbers (a character is listed when any of its parts is selected) and treats a bare number as a character; `parts` returns global part numbers and treats a bare number as a part. `options.empty` is `"none"` (default) or `"all"` for a spec that selects nothing; exclusions still apply.

### Shape drawing is Y-DOWN; shape placement is Y-UP

Coordinates that draw a shape are **Y-down**: path editing (`MtDrawingPath`, origin at part center or shape position, `1000` units = `1` em, independent of canvas resolution) and drawing-space bounding-box offsets (`ctx.bounding_box.fill_offset_y`, `stroke_offset_y`). Coordinates and metrics that place a shape are **Y-up**: position, offset, pivot, geometry bounds/origins/advances, and custom-glyph `bounds` / `advance_*`.

`ctx.paths` is rebuilt every frame, so apply path edits every frame; untouched parts keep their glyph outline.

### Custom glyphs

`ctx.glyphs:declare(declaration)` (`OnPreLayout` only) returns a one-character placeholder string to insert into `ctx.global.text`. Declaration fields:

- `path`: `MtDrawingPath`; part-center origin, Y-down, `1000` units = `1` em; snapshotted at declaration. Omit it for an invisible glyph.
- `advance_x` / `advance_y`: default `0`; Y-up, `1000` units = `1` em; downward vertical flow is negative.
- `bounds`: `{minX, minY, maxX, maxY}`, baseline origin, Y-up, `1000` units = `1` em. Omitted: `{advance_x/2 + pathMinX, 0, advance_x/2 + pathMaxX, pathMaxY - pathMinY}` (path bottom on the baseline). The bounds center becomes the part center.

A placeholder is an ordinary character: it occupies a `ctx.chars` / `ctx.parts` index (shifting later ones), counts toward the limits, inherits `fill` / `stroke` / `shadow` / `texture` / `blur`, and takes part in `mt.each_char`, `mt.layout.reflow`, and Write-On. In `OnLayout`, find it with `ctx.chars[i].text == placeholder`.

A backdrop, frame, or light spot that need not behave like text is simpler as a shape (see "Shapes apart from the text"): it needs none of the steps below. Use a custom glyph only when the decoration must stay a character.

Decoration that must not move the text:

1. Alignment: declared bounds join the box `h_align` / `v_align` align against. Declare `bounds = {0, 0, 0, 0}` (any zero-area box) so the glyph draws without measuring. A negative `margins` entry cannot fix alignment drift.
2. Spacing: `tracking` and `margins[i]` are added after every glyph, including a zero-advance one, and each line is aligned by that width, so placeholders at the end of a text line still shift it under center or right alignment. Put them on a line of their own (`text .. "\n" .. placeholders`); with zero-area bounds that line has nothing to align, and the text does not move at all.
3. Position: do not rely on the pen position. In `OnLayout`, measure the text with `mt.layout.measure_bounds_2d` and move the placeholder with `mt.layout.place_2d` (its anchor is its ink center).
4. Paint order: without ordering, characters paint in text order, so a trailing placeholder paints in front of the text. For a backdrop, set `ctx.output.manual_order_enabled = true` and list the placeholder first in `manual_order_text` (painted first = behind); Write-On then reveals it first. In 3D, view depth decides before manual order.
5. Only if the placeholder must sit inside a text line, cancel its trailing spacing in `OnPreLayout` with `ctx.global.margins[i] = -ctx.global.tracking` (both em), where `i` is `1` + the number of non-newline characters before it. This holds only when each code point shapes to one character (no ligatures, combining marks, or emoji sequences).

```lua
local badge = mt.svg_path("M 0 0 L 24 0 L 24 24 L 0 24 Z", { view_box = { 0, 0, 24, 24 }, em_scale = 1.4 })
local marker = ""

function OnPreLayout(ctx)
    marker = ctx.glyphs:declare({ path = badge, bounds = { 0, 0, 0, 0 } })
    ctx.global.text = ctx.global.text .. "\n" .. marker   -- a line of its own
end

function OnLayout(ctx)
    local textIndices, markerIndex = {}, nil
    for index = 1, ctx.char_count do
        if ctx.chars[index].text == marker then
            markerIndex = index
        else
            textIndices[#textIndices + 1] = index
        end
    end
    local textBounds = mt.layout.measure_bounds_2d(ctx, textIndices)
    if markerIndex ~= nil and textBounds ~= nil then
        mt.layout.place_2d(ctx, ctx.chars[markerIndex], textBounds.center_x, textBounds.center_y)
        ctx.output.manual_order_enabled = true
        ctx.output.manual_order_text = "c" .. markerIndex   -- behind the text
    end
end
```

### Shapes apart from the text

A shape is something placed apart from the text: a background, frame, or decoration. Use it instead of a custom glyph whenever the thing must not take part in layout, Write-On, Gradient, Bounding Box, Deform, or Crayon.

- `ctx.shapes:declare({ path, layer, parent, camera })` (`OnPreLayout` only): returns the 1-based shape number, in declaration order.
- `path`: `MtDrawingPath`; origin at the shape position, Y-down, `1000` units = `1` em; snapshotted at declaration. Omit it for an empty path. Draw the outline around the origin: the origin is the point the shape rotates, scales, and pivots about, not the middle of its outline. To turn about another point (a pendulum, a clock hand), offset the path from the origin. `mt.svg_path` with `view_box` puts the view box center at the origin.
- `layer`: `"back"` (default, behind the text) or `"front"`. Shapes of one layer overlap from the lowest `z_index`, and in declaration order when `z_index` is equal.
- `parent`: the number of a shape declared earlier (anything else raises an error); omit it for no parent. A child is placed relative to its parent: its `offset_*`, `rotation`, `scale`, `stretch_*`, and `pivot_*` work in the parent's transformed space, so `offset_x = 0.5`, `offset_y = 0.5` puts the child on the parent's position and the parent's turn, scale, and stretch carry the child along. A child can be a parent too. Only the transform is inherited, not `opacity`, `fill`, `stroke`, `shadow`, `blur`, or `texture`. A parent with `scale = 0` leaves its children no size. Only a shape can be a parent, never a text character.
- `camera`: a number returned by `ctx.shape_cameras:declare()`; omit it for none. A shape with a camera is projected in 3D by that camera. A shape with none stays 2D on the canvas, and its `z`, `yaw`, and `pitch` have no effect. A child takes its parent's camera; naming a different number raises an error; a child of a shape with no camera cannot name one.
- Shapes are not in `ctx.global.text`: `ctx.chars`, `ctx.char_count`, `ctx.parts`, and `ctx.part_count` count the text only; read shapes with `ctx.shapes[number]` and `ctx.shape_count` in `OnLayout` and `OnPath`.
- `ctx.shapes[number]` fields: `index` (the shape number), `parent` (read-only, `0` for none), `camera` (read-only, `0` for none), `offset_x` / `offset_y` (`0.5` is no offset; an untouched root shape is at the canvas center), `pivot_x` / `pivot_y`, `scale`, `stretch_x` / `stretch_y`, `rotation`, `z`, `yaw`, `pitch`, `opacity`, `z_index`, `fill`, `stroke`, `shadow`, `texture`, `blur`, and `path` (`OnLayout` only), written like `ctx.chars[index]`.
- `z_index` (number, default `0`, set in `OnLayout` every frame): orders the shapes of one layer from the lowest; a higher value is drawn in front and equal values keep declaration order. It never moves a shape across the text, and it is independent of `parent`, so a parent can be painted over its child. NaN raises an error. Text characters ignore `z_index`.
- `ctx.shapes[number].path` (`OnLayout` only): starts each frame as the declared path. Edit it in place with `path:assign(p)`, `path:clear()`, `path:move_to()`, and the other `MtDrawingPath` methods; the `path` field itself cannot be reassigned. Edits apply to that frame and reset to the declared path on the next frame.
- `ctx.paths:shape(number)` (`OnPath` only): returns a one-element array holding that shape's part, starting from the path `OnLayout` left. `ctx.paths:part`, `character`, and `select` reach the text only.
- Full-screen sizing: one canvas height is `1000 / ctx.font.em_size` path units; the canvas width is `(1000 / ctx.font.em_size) * ctx.canvas.aspect_ratio`. Shapes ignore Global, so a full-screen path needs no inverse Global transform.
- Layout helpers on shapes: `mt.layout.place_2d`, `get_canvas_position_2d`, and `canvas_to_offset_2d` accept a shape; the anchor is the shape position (the path origin). For a child they work through the parent's transform, and `place_2d` / `canvas_to_offset_2d` return the `offset` in the parent's space (raising an error when the parent's scale is `0`). `pivot_at_2d`, `measure_bounds_2d`, and `match_pose` do not accept shapes.
- Isolation and limits: shapes ignore Global transforms and `ctx.camera` (the text's camera); only a shape camera projects them in 3D. They are skipped by Write-On, Gradient, Bounding Box, Deform, and Crayon, and cannot be listed in `manual_order_text`. They use no character or part limit; their limit is `ctx.meta.limits.max_shapes` (`1024`).
- Appearance inheritance: the text's global appearance settings (color, stroke, shadow, blur, glow, texture) apply to shapes by default. Override the ones you do not want on `ctx.shapes[number]` in `OnLayout` (e.g. `shape.stroke.use = true; shape.stroke.width = 0.0`).

#### Shape cameras (3D for shapes)

- `ctx.shape_cameras` is separate from `ctx.camera` and moves only the shapes that name it. `ctx.shape_cameras:declare()` (`OnPreLayout` only) returns the 1-based camera number; at most `16` cameras per frame.
- `ctx.shape_cameras[number]` (`OnLayout`, read and write) has `target_x`, `target_y`, `yaw`, `pitch`, `perspective`, `zoom`, `lens_shift_x`, `lens_shift_y`, with the meaning and units of the same `ctx.camera` fields. Every frame each camera starts from the text camera's defaults (`target_x = 0.5`, `target_y = 0.5`, `yaw = 0`, `pitch = 0`, `perspective = 0.5`, `zoom = 1`, `lens_shift_x = 0`, `lens_shift_y = 0`): write every field you want changed every frame. `perspective` is clamped to `0..1`. Every value must be finite; NaN or inf raises an error.
- With `perspective = 0.5` and no `yaw` / `pitch` / `zoom` change, the camera is two canvas heights from the plane `z = 0`. A point at `z = 0` is seen where it is placed only when `target_x` / `target_y` are `0.5`. To scale a shape about its own place as it moves in depth, set `target_x` / `target_y` to that place (shares of the canvas) and `lens_shift_x` / `lens_shift_y` to the target minus `0.5`: points at `z = 0` then stay where they are and points nearer or farther grow or shrink about it.
- `z` is a distance along the view direction in canvas heights, in the parent's space; positive is farther from the camera.
- A shape's 3D pose order is: `scale` (across the shape's plane, x and y only), then `pitch`, then `yaw`, then `rotation` in the plane, then `offset`; a child's pose is carried by its parent's. `scale` does not scale depth, so under a scaled parent a rotated child shears. To keep what hangs from a rotated shape undistorted, size shapes in their paths and in the parent's-length part of their `offset`, and leave `scale` at `1`.
- To make a child face the camera whatever its parent's pose, give it the `pitch`, `yaw`, and `rotation` of the rotation that undoes its parent's accumulated rotation (the transpose of the product of the poses of the ancestors; read the three angles back in the pose's order). This is exact only while every ancestor has `scale = 1`.
- Paint order under a shape camera: shapes under one camera, in one layer and at one `z_index`, are painted farthest first. Equal depths keep declaration order, which rounding can flip, so give parts that must keep an order their own `z_index`. Shapes of different cameras, or with none, are ordered only by layer, `z_index`, and declaration order.
- A shape whose pose or camera cannot be carried out in numbers (non-finite, or so large it overflows) is not drawn, and the rest of the frame is unaffected.

```lua
local rectangle = mt.svg_path("M -500 -300 L 500 -300 L 500 300 L -500 300 Z")
local background

function OnPreLayout(ctx)
    background = ctx.shapes:declare({ path = rectangle })
end

function OnLayout(ctx)
    local shape = ctx.shapes[background]
    shape.fill.use = true
    shape.fill.color = { r = 0.1, g = 0.1, b = 0.3, a = 1.0 }
    shape.stroke.use = true
    shape.stroke.width = 0.0
end
```

### Glyph-less characters report their font cell

A space's `geometry.bounds_*` is its font cell: its own advance along the flow axis, and the cell height (horizontal) or column width (vertical) across it. Its `bounds_center_*` lines up with its neighbors, so positioning against `bounds_center_*` or `mt.layout.match_pose` needs no special case for spaces.

### `ctx.global.margins`

A 1-based dense array indexed like `ctx.chars`. `margins[i]` is added in em, together with `tracking`, to the advance **after** character `i`. Non-integer or string keys, holes, and non-number elements raise an error. Any length is allowed: missing entries add nothing, and entries past the last character are unused.

`utf8.len(ctx.global.text)` may differ from the shaped character count (combining marks, ligatures, grapheme clusters); do exact-count work in `OnLayout`.

### `ctx.output.manual_order_text`

Tokens separated by commas or spaces (or built safely from encoded integer entries via `mt.order_text({ mt.CHAR + i, mt.PART + p })`); invalid tokens are ignored, and a part listed twice uses its first occurrence:

- `c<n>`: 1-based character `n`; expands to all its parts in the current part order.
- `p<n>`: 1-based global part `n`.
- `<n>`: no prefix; a part index.
- `<a>-<b>`: inclusive range; a bare endpoint takes the other endpoint's prefix, and mixed `c`/`p` endpoints are invalid; expands ascending.

Listed elements move to the front of the draw/reveal queue in the given order; **unlisted parts are not hidden** and follow in their base order. The order comes from the undeformed layout, not animated positions. Visibility is controlled by `write_on_start` / `write_on_end`, not by manual order.

Front of the queue means painted first, so listed elements end up **behind** the rest: list the backdrop, not the text. Characters are ranked by their best part rank and painted as one block, so `p<n>` also moves the character owning part `n`.

2D painting follows manual order. In 3D, view depth is primary; manual order, stroke order, then layout order break equal-depth ties. Write-On reveal follows manual order in both 2D and 3D.

## 8. Script metadata header

Leading Lua comments configure the simulator and host; they are not runtime API. The header is the unindented `--` lines at the top of the file; the first blank line, indented line, code, or `--[[` ends single-line directive parsing, and directives after that are ignored. The plugin reads only `@api_level`, `@input`, and `@time_independent`; every other directive configures only the simulator. `@MugTypography` must appear within the first 5 lines for the simulator to recognise the script.

```lua
-- @MugTypography
-- @duration 5.0           -- initial preview length in seconds
-- @required 3d            -- turn on the simulator's 3D projection
-- @title Falling Letters
-- @author Mug
-- @version 1.0
-- @api_level 13
-- @input number 1 "Amplitude" default=15.0
--[[ @description
Characters fall into place one by one.
]]
--[[ @description.ja
文字が一つずつ落ちて定位置に収まります。
]]
```

- `@api_level`: makes unsupported plugin versions reject the script cleanly instead of failing at runtime.
- `-- @time_independent` (no value): declares identical output across time while Inspector values are unchanged, letting the host reuse the overlay and skip frame-varying notification. It is an author promise, not analysis: do not declare it for output depending on `ctx.time`, `ctx.frame`, timeline information, call counts, or external state. Inspector changes (including animated `@input` slots), source edits, and render size changes still invalidate reuse; other time-varying effects stay active. The simulator parses it but keeps evaluating preview frames.
- `-- @animation_id FAD002`: ID of a bundled sample only (its genre's three capital letters + a three-digit number), shown in the browser and MCP search. Do not write it in your own scripts. Not a runtime API.

Description metadata:

- Default: `--[[ @description\n<text>\n]]`.
- Translation: `--[[ @description.<locale>\n<text>\n]]`; e.g. `ja`, `en`, `en-US`.
- Locale tags: case-insensitive; first declaration per locale wins.
- Display fallback: nonempty exact locale, nonempty base language, default.
- Search: default and all translations, independent of display locale.
- Content: one sentence describing visible motion; English <=30 words preferred; no API names or settings lists.
- Ordering: all single-line metadata before any description block; the first `--[[` ends header-directive parsing.
- Host: descriptions are Lua comments, ignored by the plugin; no API-level bump.

`@recommend` sets the simulator's initial scene. Use it **only** when the effect needs specific conditions; otherwise do not pin text, position, or background, or it becomes unclear whether a result came from the script or the preset. Use exactly these spellings; colours are `#RRGGBB` or `#RRGGBBAA`:

- `@recommend bg <spec>`: a colour, or `checkerboard` / `solid`; both may share a line: `bg checkerboard #ffffff`.
- `@recommend fill <#hex>`: global fill colour.
- `@recommend gradient <#hex>`: global gradient **end** colour; the fill colour is the other end.
- `@recommend pos <X> <Y>`: global position; larger X is right, larger Y is up; center is `0.5 0.5`.
- `@recommend text "<string>"`: quoted; `\n` is a newline. `""` starts the scene with no text, for a full-screen effect that draws without body text.
- `@recommend vertical <boolean>`: initial writing direction on load; not enforced during evaluation.
- `@recommend lang <code>`: picks a font for that language, e.g. `ja`; inferred from `text` when omitted.

`@input` exposes a user-editable, keyframeable Inspector parameter, read from the matching `ctx.inputs` array. Use it for coefficients, colors, booleans, or text the user should control; do not declare unused slots.

`@input <type> <index> "<label>" [default=<value>]`

- `number`: index=1..14 (`ctx.inputs.numbers[index]`); finite default=-1000000..1000000; omitted=0.0
- `color`: index=1..8 (`ctx.inputs.colors[index]`); default={r,g,b,a}, channels=0..1; omitted={1,1,1,1}
- `text`: index=1..4 (`ctx.inputs.texts[index]`); quoted single-line NUL-free UTF-8 default<=4096 bytes; omitted=""
- `boolean`: index=1..8 (`ctx.inputs.booleans[index]`); default=true or false; omitted=false
- label: quoted UTF-8, 1..64 bytes
- label/text escapes: `\"` and `\\` only
- each type/index pair: at most once
- Inspector visibility: declared slots only
- fixed read-only arrays: numbers=14, colors=8, texts=4, booleans=8; indexes are 1-based

## 9. Execution environment and compatibility

- Available standard libraries: `math`, `string`, `table`, `utf8`, safe base functions.
- Unavailable: `os`, `io`, `package`, `require`, `dofile`, `loadfile`, `load`, `debug`, `collectgarbage`, `rawget`, `rawset`, `getmetatable`, `setmetatable`. No file, network, or process access.
- Resource limits: 5,000,000 instructions per callback invocation; 128 MiB memory. Exceeding either aborts the frame.
- `print(...)`: writes to the simulator Output panel; in the plugin it goes only to the plugin log, which users do not see.
- Operations that raise an error: writing a non-writable field or outside its `W:` phase, adding an unknown field, type mismatch, replacing or resizing `ctx.chars` / `ctx.parts`, assigning an invalid string to an enumerated field, or passing non-finite numbers (`NaN` / `inf`) to shape cameras or `z_index`.

### Runtime debugging with print

1. Do not add `print(...)` in normal generation or static fixes (syntax, API usage, units, Inspector overrides), and do not request simulator logs then.
2. Only for runtime-dependent issues (unexpected curves, timing glitches, boundary states), insert temporary `print(...)` calls for the suspect values.
3. Then ask the user to mark the range on the timeline if needed, click the Frame Dump button (bug icon), and share the log. It contains a `=== SIMULATOR CONTEXT ===` header (canvas size, FPS, text, global Inspector settings, Script Inputs, character topology) followed by `=== FRAME LOGS ===`.
4. Remove all diagnostic `print(...)` calls from the final script.

### Compatibility

**"Needs API N (this build: M)"** means the script declares a level the installed plugin does not implement, so it never runs. The script is not buggy; the plugin is older than this reference. Do not lower `@api_level`: that only removes the guard, and the script then fails on whichever newer API it uses. The user picks:

- Update the plugin to this reference's target level.
- Rewrite for the older plugin using **that** plugin's reference: ask the user to attach the `lua_api_for_ai.md` bundled with the installed version. This document cannot tell which of its entries a later version added.

The online simulator always serves the current reference, so users on older plugins hit this when copying scripts from it. Compare the target level above with the reported `this build:` number.

## 10. Complete example

Preserves Inspector transforms and uses fixed-duration transitions. The number input is a canvas-height displacement ratio.

```lua
-- @MugTypography
-- @title Staggered Drop
-- @version 1.0
-- @api_level 13
-- @input number 1 "Travel" default=0.15
--[[ @description
Letters drop into place and leave downward with staggered timing.
]]

function OnLayout(ctx)
    local intro, outro = mt.timeline.intro_outro_seconds(ctx, 0.5, 0.5)
    local travel = ctx.inputs.numbers[1]
    for _, character, info in mt.each_char(ctx) do
        local enter = mt.ease.out_cubic(mt.stagger_progress(intro, info.progress, 0.3))
        local leave = mt.ease.in_cubic(mt.stagger_progress(outro, info.progress, 0.3))
        character.offset_y = character.offset_y + (1.0 - enter) * travel - leave * travel
        character.opacity = character.opacity * enter * (1.0 - leave)
    end
end
```

## 11. Motion design and animation principles

Start from the user's requested mood, restraint, readability needs, and genre conventions. Principles are tools for that intent, not effects every script must show. A raw mathematical mapping often feels flat, but linear, uniform, or minimal motion is correct when the concept is mechanical, synchronized, restrained, or informational. Build only the complexity the concept needs.

1. Interpret intent through metaphor: translate the prompt into a physical or visual concept (elastic impact, zero-gravity float, optical slit-scan, mechanical unfolding) and let every parameter serve it.
2. Select supporting principles from timing, anticipation, follow-through, staging, squash and stretch, and overlapping action:
   - Weight and inertia: purposeful acceleration or deceleration for physical motion; anticipation and settling when the material calls for it.
   - Elasticity and mass: proportional deformation (`stretch_x` / `stretch_y` with inverse volume conservation, or `mt.bounce_ground` / `mt.impact_squash`) and deliberate edge/baseline pivots (`mt.layout.pivot_at_2d`) only for materials that bend, compress, or rebound.
   - Overlapping action: stagger characters, parts, or secondary properties (`mt.stagger_progress`, `mt.stagger_pattern`) for organic subjects; keep them synchronized for rigidity, machinery, ceremony, or clarity.
3. Leverage Mug Typography's built-in engines instead of re-implementing math from scratch:
   - Ballistic landing, wall collisions, and squash-and-stretch: `mt.bounce_ground(ctx, item, groundY, config)` and `mt.bounce_wall(ctx, item, wallX, config)` automatically compute and apply `offset_y` / `offset_x`, `stretch_x`, and `stretch_y` against a canvas or relative line (`align_to = "bottom" | "bounds_bottom" | "baseline" | "center"`). For raw 1D/2D trajectories or collision impulses, use `mt.bounce_y`, `mt.bounce_x`, `mt.impact_squash`, `mt.projectile_2d`, `mt.friction_decay`, and `mt.spring`.
   - Continuous procedural motion and noise: `mt.wiggle`, `mt.noise1`, `mt.noise2`, `mt.wave`, `mt.wave_triangle`, `mt.wave_square`, `mt.wave_sawtooth`, `mt.cycle`, `mt.pingpong`, and deterministic per-index randomness `mt.random` / `mt.random_range` / `mt.distributed_random` seeded with `ctx.meta.instance_seed`.
   - Multi-line, character-type, and pose-synchronized layouts: `mt.layout.group_by_line(ctx)` groups characters into lines (or vertical columns); `mt.text.classify(character.text)` distinguishes Japanese scripts (`"kanji"`, `"hiragana"`, `"katakana"`), `"latin"`, `"digit"`, `"punctuation"`, and `"space"` (e.g. scaling kana or punctuation differently followed by `mt.layout.reflow(ctx)`); `mt.layout.match_pose(ctx, destination, source, options)` locks ruby, annotations, or shadow copies to a source character's full 2D/3D pose hierarchy.
   - Motion along curves and constant-speed paths: `mt.path.arc_length(points, ctx.canvas.aspect_ratio, options)` builds an arc-length parameterized spline (`path:at_distance(ratio)` returns `x, y, headingDegrees`); `mt.layout.queue_on_path(ctx, path, options)` distributes characters or parts along the curve spaced by their natural advances.
   - Sub-character part disassembly and vertex morphing: `mt.each_part(ctx, options)` animates strokes/radicals/dakuten independently in `OnLayout`; `ctx.paths` + `part.path:map_points(function(x, y, point) ... end)` warps anchor and control points in `OnPath` while preserving contour topology.
   - Standalone shapes, backgrounds, and jointed rigs: `ctx.shapes:declare({ path, layer, parent, camera })` builds screen-wide frames, particle fields, and hierarchical parent-child character rigs without using character slots or being disturbed by `ctx.global`; `ctx.shape_cameras:declare()` adds independent 3D cameras for shapes.
   - Custom inline/fitted vector glyphs: `ctx.glyphs:declare` with `mt.svg_path` / `mt.drawing_path` creates custom symbols, underlines, badges, and reaction marks that follow `ctx.global` rotation and scale.
   - Optical, focus, and neon effects: `ctx.global.blur` / `character.blur` (`amount_x`, `amount_y`, `glow`) for rack-focus, directional motion smear, and self-luminous glow; `ctx.global.shadow` / `character.shadow` (`distance`, `angle`, `blur_x`, `blur_y`, `glow`, `color`) for neon haloes; `ctx.global.gradient` and `mt.color.lerp_oklab` / `lerp_oklch` / `from_okhsl` for perceptual color choreography.

Read the relevant section or entry before using any of these. Finally, confirm the script still conveys the concept without breaking the user's constraints or adding motion with no clear role.

## 12. Checklist before returning a script

The field tables and contract sections define the values; verify the script's use of them:

1. Frame independence: all values derive from current inputs; no `x = x + 1` style accumulation; shared locals are overwritten each frame before use (Callbacks).
2. Access: each write is allowed by the field's `W:` phases (writing `ctx.global` or `ctx.camera` in `OnLayout` raises an error); counts and collections are read only in `OnLayout` / `OnPath`; indexes are 1-based (Callbacks).
3. Units and reference points: offsets and pivots are composed around `0.5` (`offset + delta`), never reset to a bare `0.0`; no `geometry` canvas coordinate is assigned to a pivot; em lengths such as `shadow.distance` and `blur.amount_*` stay near font-size scale; pre/post-global spaces match (Coordinates and transforms).
4. Direction: 2D angles are clockwise-positive (`shadow.angle = 90` is down); vectors from an angle use `mt.polar_offset_2d`; drawing paths and bounding-box fill/stroke Y offsets are Y-down while placement is Y-up (Coordinates and transforms; Paths, text and drawing order).
5. Placement: measured post-global positions (`measure_bounds_2d`, `get_canvas_position_2d`) go through `place_2d` / `canvas_to_offset_2d` / `pivot_at_2d`; pivots change only to change a rotation/scale reference; per-character `scale` / `stretch_*` changes are followed by `mt.layout.reflow` when spacing must follow; custom-glyph decorations declare zero-area `bounds`, sit on a line of their own, are placed by measurement, and are ordered in front or behind on purpose, whereas standalone backgrounds/frames use `ctx.shapes` (Coordinates and transforms; Paths, text and drawing order).
6. Inspector composition: unrelated settings are preserved; direct assignments are intentional replacements; each individual style (`fill`, `stroke`, `shadow`, `texture`, `blur`) is paired with `use = true` in the same callback and keeps effective inherited components via `mt.<group>.resolve` for partial changes (Inspector composition and style inheritance).
7. Timing: fixed-duration transitions use `mt.timeline.intro_outro_seconds` or `mt.timeline.remaining`; clip-proportional timing is intentional; random ordering/stagger is seeded with `ctx.meta.instance_seed` (Time and transitions).
8. API calls: defaults, enums, table shapes, and argument units come from the full entries; `ctx.paths`, `ctx.glyphs`, `ctx.shapes`, `ctx.shape_cameras`, and `path` methods use colons (`:`); no deprecated APIs (Reference lookup; Paths, text and drawing order).
9. Rendering policy: 3D is disabled (`ctx.output.force_disable_3d_projection = true`) only when explicitly required; textures are added only when the request or material requires them (Essential contract).
10. Color: OKLab (`lerp_oklab`) for blending, OKLCH (`lerp_oklch`, `from_oklch`) for hue travel, OKHSL (`from_okhsl`) rather than OKHSV for lightness changes (Colors, gradients and textures).
11. Delivery: complete new scripts declare `-- @api_level 13`; `@input` declarations match used `ctx.inputs` slots; diagnostic `print(...)` calls are removed (Script metadata header; Execution environment and compatibility).
12. Creative intent: requested restraint and readability are respected; built-in physics, layout, path, part, shape, and optical helpers are used where appropriate; each secondary motion or optical change serves the requested effect (Motion design and animation principles).

State assumptions that affect the result and any required facts that remain unknown.

## 13. ctx reference

Format: `path : type [R:readable phases  W:writable phases]`, then unit metadata,
then description. Phases are `init` / `pre` / `layout` / `path`, and `all` is all four.
Indices are 1-based.

### ctx

```text
ctx.time : number [R:pre,layout,path read-only]
 unit=seconds
 Current clip-local time in seconds (0 at the clip head).
ctx.frame : number [R:pre,layout,path read-only]
 unit=frames
 Current clip-local frame number (0 at the clip head). May include subframes.
ctx.fps : number [R:pre,layout,path read-only]
 unit=fps
 Frames per second.
ctx.text : string [R:pre,layout read-only]
 Deprecated and scheduled for removal. Use ctx.global.text to read or rewrite the current text. DEPRECATED.
ctx.char_count : integer [R:layout,path read-only]
 Number of active characters after layout generation.
ctx.shape_count : integer [R:layout,path read-only]
 Number of shapes declared for this frame; ctx.char_count counts the text only.
ctx.part_count : integer [R:layout,path read-only]
 Number of active parts after layout generation.
ctx.canvas : MtCanvas [R:all read-only]
 Canvas dimensions.
ctx.fonts : string[] [R:all read-only]
 Font names accepted by ctx.global.font_name, indexed from 1.
ctx.timeline : MtTimeline [R:pre,layout,path read-only]
 Host clip timing information.
ctx.font : MtFontMetrics [R:layout,path read-only]
 Resolved font metrics in normalized canvas coordinates.
ctx.meta : MtMeta [R:all read-only]
 Read-only API, plugin, and capability metadata.
ctx.inputs : MtScriptInputs [R:all read-only]
 Fixed Inspector input arrays.
ctx.global : MtGlobal [R:pre,layout,path read-only]
 Writable base global parameters.
ctx.camera : MtCamera [R:pre,layout,path read-only]
 Writable base 3D camera parameters.
ctx.chars : MtCharacter[] [R:layout,path read-only]
 Resolved characters, indexed from 1.
ctx.parts : MtPart[] [R:layout,path read-only]
 Resolved parts, indexed from 1.
ctx.paths : MtPathCollection [R:path read-only]
 Lazy selector for normalized drawing paths available in OnPath.
ctx.glyphs : MtGlyphDeclarations [R:pre read-only]
 Custom glyph declarations accepted before shaping and layout.
ctx.shapes : MtShapes [R:pre,layout,path read-only]
 Shapes laid out apart from the text: declare them in OnPreLayout, then read them by one-based shape number in OnLayout and OnPath.
ctx.shape_cameras : MtShapeCameras [R:pre,layout read-only]
 Cameras that view shapes, apart from the text's camera: declare them in OnPreLayout, then read and write them by one-based camera number in OnLayout.
ctx.bounding_box : MtBoundingBox [R:layout,path read-only]
 Writable bounding-box drawing parameters.
ctx.output : MtOutput [R:layout,path read-only]
 Writable output filtering and ordering parameters.
```

### ctx.canvas

```text
ctx.canvas.width : number [R:all read-only]
 unit=px  base=canvas width
 Canvas width in pixels.
ctx.canvas.height : number [R:all read-only]
 unit=px  base=canvas height
 Canvas height in pixels.
ctx.canvas.aspect_ratio : number [R:all read-only]
 unit=ratio  base=width / height
 Canvas width divided by height.
ctx.canvas.pixel_aspect_ratio : number [R:all read-only]
 unit=ratio  base=pixel width / pixel height
 Host project pixel aspect ratio.
```

### ctx.timeline

```text
ctx.timeline.available : boolean [R:pre,layout,path read-only]
 Whether the host supplied a finite clip range.
ctx.timeline.start_frame : number [R:pre,layout,path read-only]
 unit=frames
 First frame of the clip range in clip-local time (always 0 while available).
ctx.timeline.end_frame : number [R:pre,layout,path read-only]
 unit=frames
 Last frame of the clip range in clip-local time (equals duration_frames).
ctx.timeline.duration_frames : number [R:pre,layout,path read-only]
 unit=frames
 Clip range length measured from start_frame to end_frame.
ctx.timeline.duration_seconds : number [R:pre,layout,path read-only]
 unit=seconds
 Clip range length in seconds.
ctx.timeline.progress : number [R:pre,layout,path read-only]
 unit=unit_interval
 Current normalized progress through the clip range, clamped to 0 through 1.
```

### ctx.font

```text
ctx.font.em_size : number [R:layout,path read-only]
 unit=canvas_ratio_length  base=canvas height (1.0 em)
 One untransformed em normalized by canvas height.
ctx.font.ascent : number [R:layout,path read-only]
 unit=canvas_ratio_length  base=canvas height
 Font ascent normalized by canvas height.
ctx.font.descent : number [R:layout,path read-only]
 unit=canvas_ratio_length  base=canvas height
 Positive font descent magnitude normalized by canvas height.
ctx.font.line_height : number [R:layout,path read-only]
 unit=canvas_ratio_length  base=canvas height
 Recommended font line height normalized by canvas height.
ctx.font.units_per_em : number [R:layout,path read-only]
 unit=font_design_units  base=em square
 Font design units per em.
```

### ctx.meta.capabilities

```text
ctx.meta.capabilities.has_3d : boolean [R:all read-only]
 Whether 3D projection parameters affect Native rendering.
```

### ctx.meta

```text
ctx.meta.api_level : integer [R:all read-only]
 Mug Typography Lua API compatibility level.
ctx.meta.plugin_version : string [R:all read-only]
 Plugin version for diagnostics and display.
ctx.meta.capabilities : MtCapabilities [R:all read-only]
 Native preset feature availability.
ctx.meta.limits : MtLimits [R:all read-only]
 Maximum character and part capacities for this instance.
ctx.meta.instance_seed : integer [R:all read-only]
 Stable per-instance random seed, distinct across instances of the same script and constant for the lifetime of one instance. Use it with mt.random/mt.random_range instead of a fixed literal seed so per-character variance differs across instances instead of repeating the same pattern.
```

### ctx.meta.limits

```text
ctx.meta.limits.max_characters : integer [R:all read-only]
 Maximum number of characters this instance can lay out and expose to scripts.
ctx.meta.limits.max_parts : integer [R:all read-only]
 Maximum number of parts this instance can lay out and expose to scripts.
ctx.meta.limits.max_shapes : integer [R:all read-only]
 Maximum number of shapes this instance can lay out and expose to scripts; shapes use no character or part slots.
```

### ctx.inputs

```text
ctx.inputs.numbers : number[] [R:all read-only]
 unit=unitless
 Length 14; 1-based.
ctx.inputs.colors : MtColor[] [R:all read-only]
 Length 8; 1-based.
ctx.inputs.texts : string[] [R:all read-only]
 Length 4; 1-based.
ctx.inputs.booleans : boolean[] [R:all read-only]
 Length 8; 1-based.
```

### ctx.global

```text
ctx.global.text : string [R:pre,layout,path W:pre]
 Text to shape and lay out. Inspector line-break syntax is interpreted before OnPreLayout; script-written text is not decoded again.
ctx.global.font_name : string [R:pre,layout,path W:pre]
 Font family identity used for shaping.
ctx.global.tracking : number [R:pre,layout,path W:pre]
 unit=em  base=font size (1.0 = 1 em)
 Additional character tracking.
ctx.global.line_spacing : number [R:pre,layout,path W:pre]
 unit=multiplier  neutral=1
 Line spacing multiplier.
ctx.global.vertical : boolean [R:pre,layout,path W:pre]
 Whether vertical writing is enabled.
ctx.global.h_align : string [R:pre,layout,path W:pre]
 values=left|center|right
 Horizontal alignment.
ctx.global.v_align : string [R:pre,layout,path W:pre]
 values=top|center|bottom|baseline
 Vertical alignment.
ctx.global.margins : number[] [R:pre,layout,path W:pre]
 unit=em  base=font size (1.0 = 1 em)
 Per-character margins.
ctx.global.emoji : MtGlobalEmoji [R:pre,layout,path W:pre]
 Emoji placement and font settings. Changing any value rebuilds the layout, so avoid animating them every frame.
ctx.global.position_x : number [R:pre,layout,path W:pre]
 unit=canvas_ratio_position  base=canvas width (0.5 = center)
 Global X position; 0.5 is the canvas center.
ctx.global.position_y : number [R:pre,layout,path W:pre]
 unit=canvas_ratio_position  axis=y_up  base=canvas height (0.5 = center)
 Global Y position; 0.5 is the canvas center and values grow upward.
ctx.global.rotation : number [R:pre,layout,path W:pre]
 unit=degrees  neutral=0  axis=clockwise_positive
 Global rotation in degrees. Positive turns clockwise: 90 makes what pointed up point right.
ctx.global.yaw : number [R:pre,layout,path W:pre]
 unit=degrees  neutral=0  axis=object_yaw  base=+ turns the right edge toward the viewer (-Z)
 Global yaw in degrees; used by the 3D preset.
ctx.global.pitch : number [R:pre,layout,path W:pre]
 unit=degrees  neutral=0  axis=object_pitch  base=+ turns the top edge toward the viewer (-Z)
 Global pitch in degrees; used by the 3D preset.
ctx.global.scale : number [R:pre,layout,path W:pre]
 unit=multiplier  neutral=1  range=0.0001..+inf
 Uniform global scale.
ctx.global.stretch_x : number [R:pre,layout,path W:pre]
 unit=multiplier  neutral=1  base=horizontal
 Horizontal global stretch.
ctx.global.stretch_y : number [R:pre,layout,path W:pre]
 unit=multiplier  neutral=1  base=vertical
 Vertical global stretch.
ctx.global.pivot_x : number [R:pre,layout,path W:pre]
 unit=canvas_ratio_displacement  neutral=0.5  base=canvas width, measured from global.position
 Global pivot X displacement from global position in canvas-normalized units; 0.5 means zero displacement.
ctx.global.pivot_y : number [R:pre,layout,path W:pre]
 unit=canvas_ratio_displacement  neutral=0.5  axis=y_up  base=canvas height, measured from global.position
 Global pivot Y displacement from global position in canvas-normalized units; 0.5 means zero displacement and values grow upward.
ctx.global.opacity : number [R:pre,layout,path W:pre]
 unit=unit_interval  neutral=1
 Overall opacity multiplier in the range 0 to 1 applied to everything the effect draws (fill, gradient, stroke, shadow, bounding box).
ctx.global.fill : MtGlobalFill [R:pre,layout,path W:pre]
 Global fill color settings.
ctx.global.gradient : MtGradient [R:pre,layout,path W:pre]
 Global gradient settings.
ctx.global.texture : MtTexture [R:pre,layout,path W:pre]
 Global texture (fill material) settings.
ctx.global.blur : MtBlur [R:pre,layout,path W:pre]
 Global blur of the text itself (fill, gradient, texture, stroke, crayon). The shadow has its own blur in shadow.blur_x and shadow.blur_y.
ctx.global.stroke : MtGlobalStroke [R:pre,layout,path W:pre]
 Resolved global stroke settings.
ctx.global.shadow : MtGlobalShadow [R:pre,layout,path W:pre]
 Global shadow settings.
```

### ctx.global.fill

```text
ctx.global.fill.color : MtColor [R:pre,layout,path W:pre]
 Global fill color.
ctx.global.fill.transparent : boolean [R:pre,layout,path W:pre]
 Whether the fill is transparent while stroke and effects remain visible.
```

### ctx.global.gradient

```text
ctx.global.gradient.color_space : string [R:pre,layout,path W:pre]
 values=none|okhsv|okhsl|oklab|linear_rgb|oklch_short|oklch_long|crayon
 Gradient mode; none disables the gradient. oklch_short / oklch_long interpolate like CSS oklch with shorter / longer hue; crayon draws scribble strokes instead of a gradient.
ctx.global.gradient.end_color : MtColor [R:pre,layout,path W:pre]
 Gradient end color.
ctx.global.gradient.midpoint : number [R:pre,layout,path W:pre]
 unit=unit_interval
 Gradient midpoint in the range 0 to 1.
ctx.global.gradient.angle : number [R:pre,layout,path W:pre]
 unit=degrees  neutral=0  axis=clockwise_positive  base=0 = left-to-right (+X)
 Gradient angle in degrees; 0 runs left to right and positive rotates clockwise.
ctx.global.gradient.start_position : number [R:pre,layout,path W:pre]
 unit=gradient_position  base=transformed global bounding box; 0.0-1.0 is the standard range
 Gradient start position relative to the transformed text BB.
ctx.global.gradient.end_position : number [R:pre,layout,path W:pre]
 unit=gradient_position  base=transformed global bounding box; 0.0-1.0 is the standard range
 Gradient end position relative to the transformed text BB.
```

### ctx.global.stroke

```text
ctx.global.stroke.width : number [R:pre,layout,path W:pre]
 unit=em  base=font size (1.0 = 1 em)
 Resolved global stroke width.
ctx.global.stroke.gap : number [R:pre,layout,path W:pre]
 unit=em  base=font size (1.0 = 1 em)
 Resolved global fill-to-stroke gap.
ctx.global.stroke.color : MtColor [R:pre,layout,path W:pre]
 Resolved global stroke color.
ctx.global.stroke.outer_width : number [R:pre,layout,path W:pre]
 unit=em  base=font size (1.0 = 1 em)
 Outer stroke width; active only while the inner stroke width is positive.
ctx.global.stroke.outer_color : MtColor [R:pre,layout,path W:pre]
 Outer stroke color.
ctx.global.stroke.order : string [R:pre,layout,path W:pre]
 values=fill_over_stroke|stroke_over_fill|fill_over_stroke_per_character
 Whether fill or stroke is drawn on top. fill_over_stroke_per_character finishes every pass of one character before the next starts.
ctx.global.stroke.join : string [R:pre,layout,path W:pre]
 values=miter_clip|round|bevel|miter_round|miter_bevel
 Stroke corner join style.
ctx.global.stroke.miter_limit : number [R:pre,layout,path W:pre]
 unit=multiplier  neutral=1
 Maximum length of sharp miter joins.
```

### ctx.global.shadow

```text
ctx.global.shadow.enabled : boolean [R:pre,layout,path W:pre]
 Whether the global shadow pass is enabled.
ctx.global.shadow.distance : number [R:pre,layout,path W:pre]
 unit=em  range=-inf..10  base=font size (1.0 = 1 em)
 Global shadow distance, in em (1.0 = one font size).
ctx.global.shadow.angle : number [R:pre,layout,path W:pre]
 unit=degrees  neutral=0  axis=clockwise_positive  base=0 = right (+X), 90 = straight DOWN
 Global shadow angle in degrees; 0 casts the shadow to the right and positive rotates clockwise (90 = straight down).
ctx.global.shadow.blur_x : number [R:pre,layout,path W:pre]
 unit=em  neutral=0  range=0..10  base=font size (1.0 = 1 em)
 Global shadow horizontal blur, as a Gaussian sigma in em (1.0 = one font size).
ctx.global.shadow.blur_y : number [R:pre,layout,path W:pre]
 unit=em  neutral=0  range=0..10  base=font size (1.0 = 1 em)
 Global shadow vertical blur, as a Gaussian sigma in em (1.0 = one font size).
ctx.global.shadow.glow : number [R:pre,layout,path W:pre]
 unit=unitless  neutral=0  range=0..10
 Global shadow glow strength. It brightens the blurred shadow into a glow and has no effect while the shadow is not blurred (0 = no glow).
ctx.global.shadow.color : MtColor [R:pre,layout,path W:pre]
 Resolved global shadow color.
```

### ctx.global.emoji

```text
ctx.global.emoji.offset_x : number [R:pre,layout,path W:pre]
 unit=em  neutral=0  base=font size (1.0 = 1 em)
 Horizontal emoji offset from where the font places it; the advance is unchanged.
ctx.global.emoji.offset_y : number [R:pre,layout,path W:pre]
 unit=em  neutral=0  axis=y_up  base=font size (1.0 = 1 em)
 Vertical emoji offset from where the font places it; positive moves up and the advance is unchanged.
ctx.global.emoji.scale : number [R:pre,layout,path W:pre]
 unit=multiplier  neutral=1  range=0.001..+inf
 Emoji size as if set in a font this many times the text size, advance included.
ctx.global.emoji.use_custom_font : boolean [R:pre,layout,path W:pre]
 Whether emoji use font_name instead of the system emoji font.
ctx.global.emoji.font_name : string [R:pre,layout,path W:pre]
 Custom emoji font, one of ctx.fonts; kept but ignored while use_custom_font is false. An unknown name falls back to the system emoji font.
ctx.global.emoji.use_outline : boolean [R:pre,layout,path W:pre]
 Whether emoji are drawn from the custom font's outlines as ordinary characters; only applies while use_custom_font is true. Glyphs without an outline, such as colour-only ones, draw nothing.
```

### ctx.camera

```text
ctx.camera.target_x : number [R:pre,layout,path W:pre]
 unit=canvas_ratio_position  base=canvas width (0.5 = center)
 Camera target X in host-normalized coordinates.
ctx.camera.target_y : number [R:pre,layout,path W:pre]
 unit=canvas_ratio_position  axis=y_up  base=canvas height (0.5 = center)
 Camera target Y in host-normalized coordinates; values grow upward.
ctx.camera.yaw : number [R:pre,layout,path W:pre]
 unit=degrees  neutral=0  axis=camera_orbit  base=+ orbits the camera to the RIGHT of the target (subject appears to turn left)
 Camera orbit yaw in degrees.
ctx.camera.pitch : number [R:pre,layout,path W:pre]
 unit=degrees  neutral=0  axis=camera_orbit  base=+ orbits the camera UP (looking down at the subject)
 Camera orbit pitch in degrees.
ctx.camera.perspective : number [R:pre,layout,path W:pre]
 unit=perspective_strength  range=0..1  base=distancePx = f(perspective) * canvas.height; larger = camera closer
 Perspective strength.
ctx.camera.zoom : number [R:pre,layout,path W:pre]
 unit=multiplier  neutral=1  range=0.001..+inf
 Camera zoom multiplier.
ctx.camera.lens_shift_x : number [R:pre,layout,path W:pre]
 unit=canvas_ratio_length  neutral=0  base=canvas width
 Horizontal lens shift as a canvas fraction.
ctx.camera.lens_shift_y : number [R:pre,layout,path W:pre]
 unit=canvas_ratio_length  neutral=0  axis=y_up  base=canvas height
 Vertical lens shift as a canvas fraction; values grow upward.
```

### ctx.chars[i]

```text
ctx.chars[i].index : integer [R:layout,path read-only]
 One-based character index.
ctx.chars[i].text : string [R:layout,path read-only]
 Text represented by this shaped character cluster.
ctx.chars[i].part_start : integer [R:layout,path read-only]
 One-based global index of this character's first part.
ctx.chars[i].part_count : integer [R:layout,path read-only]
 Number of parts belonging to this character.
ctx.chars[i].line_index : integer [R:layout,path read-only]
 One-based source layout line index.
ctx.chars[i].geometry : MtCharacterGeometry [R:layout,path read-only]
 Read-only base character geometry before script transforms.
ctx.chars[i].offset_x : number [R:layout,path W:layout]
 unit=canvas_ratio_displacement  neutral=0.5  base=canvas width
 Character X offset; 0.5 is no displacement.
ctx.chars[i].offset_y : number [R:layout,path W:layout]
 unit=canvas_ratio_displacement  neutral=0.5  axis=y_up  base=canvas height
 Character Y offset; 0.5 is no displacement and values grow upward.
ctx.chars[i].pivot_x : number [R:layout,path W:layout]
 unit=canvas_ratio_displacement  neutral=0.5  base=canvas width, measured from the character's natural bounds center
 Character pivot X displacement from the character's natural bounds center, in canvas-normalized units; 0.5 means zero displacement.
ctx.chars[i].pivot_y : number [R:layout,path W:layout]
 unit=canvas_ratio_displacement  neutral=0.5  axis=y_up  base=canvas height, measured from the character's natural bounds center
 Character pivot Y displacement from the character's natural bounds center, in canvas-normalized units; 0.5 means zero displacement and values grow upward.
ctx.chars[i].scale : number [R:layout,path W:layout]
 unit=multiplier  neutral=1  range=0.001..+inf
 Uniform character scale.
ctx.chars[i].stretch_x : number [R:layout,path W:layout]
 unit=multiplier  neutral=1  base=horizontal
 Horizontal character stretch.
ctx.chars[i].stretch_y : number [R:layout,path W:layout]
 unit=multiplier  neutral=1  base=vertical
 Vertical character stretch.
ctx.chars[i].rotation : number [R:layout,path W:layout]
 unit=degrees  neutral=0  axis=clockwise_positive
 Character rotation in degrees. Positive turns clockwise: 90 makes what pointed up point right.
ctx.chars[i].z : number [R:layout,path W:layout]
 unit=canvas_ratio_length  neutral=0  axis=z_into_screen  base=positive = deeper/away from camera
 Character Z position.
ctx.chars[i].yaw : number [R:layout,path W:layout]
 unit=degrees  neutral=0  axis=object_yaw  base=+ turns the right edge toward the viewer (-Z)
 Character yaw in degrees.
ctx.chars[i].pitch : number [R:layout,path W:layout]
 unit=degrees  neutral=0  axis=object_pitch  base=+ turns the top edge toward the viewer (-Z)
 Character pitch in degrees.
ctx.chars[i].opacity : number [R:layout,path W:layout]
 unit=unit_interval  neutral=1
 Character opacity multiplier in the range 0 to 1 applied to the resolved fill, gradient, stroke, and shadow.
ctx.chars[i].z_index : number [R:layout,path W:layout]
 unit=unitless  neutral=0
 Paint order key of a shape within its layer (shapes only; a text character ignores it): a higher value is drawn later, in front of the lower ones, and equal values keep declaration order. It never moves a shape across the text.
ctx.chars[i].fill : MtIndividualFill [R:layout,path W:layout]
 Individual fill color override.
ctx.chars[i].stroke : MtIndividualStroke [R:layout,path W:layout]
 Individual stroke override.
ctx.chars[i].shadow : MtIndividualShadow [R:layout,path W:layout]
 Individual shadow color and blur override.
ctx.chars[i].texture : MtTexture [R:layout,path W:layout]
 Individual texture override; script-only (no host parameter group backs it), so it always reads as unused/default unless a script sets it.
ctx.chars[i].blur : MtBlur [R:layout,path W:layout]
 Individual blur of the text itself (fill, gradient, texture, stroke, crayon); script-only (no host parameter group backs it), so it always reads as unused/default unless a script sets it.
```

### ctx.chars[i].fill / ctx.parts[i].fill

```text
ctx.chars[i].fill / ctx.parts[i].fill.use : boolean [R:layout,path W:layout]
 Whether the individual fill color is used instead of the inherited one.
ctx.chars[i].fill / ctx.parts[i].fill.color : MtColor [R:layout,path W:layout]
 Raw individual fill color.
```

### ctx.chars[i].stroke / ctx.parts[i].stroke

```text
ctx.chars[i].stroke / ctx.parts[i].stroke.use : boolean [R:layout,path W:layout]
 Whether the individual stroke settings are used instead of the inherited ones.
ctx.chars[i].stroke / ctx.parts[i].stroke.width : number [R:layout,path W:layout]
 unit=em  base=font size (1.0 = 1 em)
 Raw individual stroke width.
ctx.chars[i].stroke / ctx.parts[i].stroke.gap : number [R:layout,path W:layout]
 unit=em  base=font size (1.0 = 1 em)
 Raw individual fill-to-stroke gap.
ctx.chars[i].stroke / ctx.parts[i].stroke.color : MtColor [R:layout,path W:layout]
 Raw individual stroke color.
ctx.chars[i].stroke / ctx.parts[i].stroke.outer_width : number [R:layout,path W:layout]
 unit=em  base=font size (1.0 = 1 em)
 Raw individual outer stroke width; active only while the inner stroke width is positive.
ctx.chars[i].stroke / ctx.parts[i].stroke.outer_color : MtColor [R:layout,path W:layout]
 Raw individual outer stroke color.
```

### ctx.chars[i].shadow / ctx.parts[i].shadow

```text
ctx.chars[i].shadow / ctx.parts[i].shadow.use : boolean [R:layout,path W:layout]
 Whether the individual shadow color and blur are used instead of the inherited ones.
ctx.chars[i].shadow / ctx.parts[i].shadow.color : MtColor [R:layout,path W:layout]
 Raw individual shadow color.
ctx.chars[i].shadow / ctx.parts[i].shadow.blur_x : number [R:layout,path W:layout]
 unit=em  neutral=0  range=0..10  base=font size (1.0 = 1 em)
 Individual shadow horizontal blur in em; it follows the same use flag as the shadow color. Script-only, so it reads as the frame's shadow blur until a script sets it.
ctx.chars[i].shadow / ctx.parts[i].shadow.blur_y : number [R:layout,path W:layout]
 unit=em  neutral=0  range=0..10  base=font size (1.0 = 1 em)
 Individual shadow vertical blur in em; it follows the same use flag as the shadow color. Script-only, so it reads as the frame's shadow blur until a script sets it.
ctx.chars[i].shadow / ctx.parts[i].shadow.glow : number [R:layout,path W:layout]
 unit=unitless  neutral=0  range=0..10
 Individual shadow glow strength; it follows the same use flag as the shadow color. Script-only, so it reads as the frame's shadow glow until a script sets it. No effect while the shadow is not blurred.
```

### ctx.parts[i]

```text
ctx.parts[i].index : integer [R:layout,path read-only]
 One-based global part index.
ctx.parts[i].character_index : integer [R:layout,path read-only]
 One-based index of the owning character.
ctx.parts[i].index_in_character : integer [R:layout,path read-only]
 One-based part index within the owning character.
ctx.parts[i].geometry : MtPartGeometry [R:layout,path read-only]
 Read-only base part geometry before script transforms.
ctx.parts[i].offset_x : number [R:layout,path W:layout]
 unit=canvas_ratio_displacement  neutral=0.5  base=canvas width
 Part X offset; 0.5 is no displacement.
ctx.parts[i].offset_y : number [R:layout,path W:layout]
 unit=canvas_ratio_displacement  neutral=0.5  axis=y_up  base=canvas height
 Part Y offset; 0.5 is no displacement and values grow upward.
ctx.parts[i].pivot_x : number [R:layout,path W:layout]
 unit=canvas_ratio_displacement  neutral=0.5  base=canvas width, measured from the part's natural position
 Part pivot X displacement from the part's natural position, in canvas-normalized units; 0.5 means zero displacement.
ctx.parts[i].pivot_y : number [R:layout,path W:layout]
 unit=canvas_ratio_displacement  neutral=0.5  axis=y_up  base=canvas height, measured from the part's natural position
 Part pivot Y displacement from the part's natural position, in canvas-normalized units; 0.5 means zero displacement and values grow upward.
ctx.parts[i].scale : number [R:layout,path W:layout]
 unit=multiplier  neutral=1  range=0.001..+inf
 Uniform part scale.
ctx.parts[i].rotation : number [R:layout,path W:layout]
 unit=degrees  neutral=0  axis=clockwise_positive
 Part rotation in degrees. Positive turns clockwise: 90 makes what pointed up point right.
ctx.parts[i].stretch_x : number [R:layout,path W:layout]
 unit=multiplier  neutral=1  base=horizontal
 Horizontal part stretch.
ctx.parts[i].stretch_y : number [R:layout,path W:layout]
 unit=multiplier  neutral=1  base=vertical
 Vertical part stretch.
ctx.parts[i].z : number [R:layout,path W:layout]
 unit=canvas_ratio_length  neutral=0  axis=z_into_screen  base=positive = deeper/away from camera
 Part Z position.
ctx.parts[i].yaw : number [R:layout,path W:layout]
 unit=degrees  neutral=0  axis=object_yaw  base=+ turns the right edge toward the viewer (-Z)
 Part yaw in degrees, applied at the part pivot inside the character's rotated space; script-only (no host parameter group backs it, unlike the character equivalent).
ctx.parts[i].pitch : number [R:layout,path W:layout]
 unit=degrees  neutral=0  axis=object_pitch  base=+ turns the top edge toward the viewer (-Z)
 Part pitch in degrees, applied at the part pivot inside the character's rotated space; script-only (no host parameter group backs it, unlike the character equivalent).
ctx.parts[i].opacity : number [R:layout,path W:layout]
 unit=unit_interval  neutral=1
 Part opacity multiplier in the range 0 to 1, combined with the owning character's opacity.
ctx.parts[i].fill : MtIndividualFill [R:layout,path W:layout]
 Individual fill color override.
ctx.parts[i].stroke : MtIndividualStroke [R:layout,path W:layout]
 Individual stroke override; script-only (no host parameter group backs it, unlike the character equivalent), so it always reads as unused/default unless a script sets it.
ctx.parts[i].shadow : MtIndividualShadow [R:layout,path W:layout]
 Individual shadow color and blur override; script-only (no host parameter group backs it, unlike the character equivalent), so it always reads as unused/default unless a script sets it.
ctx.parts[i].texture : MtTexture [R:layout,path W:layout]
 Individual texture override; script-only (no host parameter group backs it), so it always reads as unused/default unless a script sets it.
ctx.parts[i].blur : MtBlur [R:layout,path W:layout]
 Individual blur of the text itself (fill, gradient, texture, stroke, crayon); script-only (no host parameter group backs it), so it always reads as unused/default unless a script sets it.
```

### ctx.chars[i].geometry

```text
ctx.chars[i].geometry.canvas_origin_x : number [R:layout,path read-only]
 unit=canvas_ratio_position  base=canvas width (0.5 = center)
 Character placement origin X in normalized canvas coordinates.
ctx.chars[i].geometry.canvas_origin_y : number [R:layout,path read-only]
 unit=canvas_ratio_position  axis=y_up  base=canvas height (0.5 = center)
 Character placement origin Y in normalized canvas coordinates.
ctx.chars[i].geometry.vertical_origin_x : number [R:layout,path read-only]
 unit=canvas_ratio_position  base=canvas width (0.5 = center)
 Vertical-typesetting origin X (column axis) in normalized canvas coordinates.
ctx.chars[i].geometry.vertical_origin_y : number [R:layout,path read-only]
 unit=canvas_ratio_position  axis=y_up  base=canvas height (0.5 = center)
 Vertical-typesetting origin Y (cell top) in normalized canvas coordinates.
ctx.chars[i].geometry.bounds_center_x : number [R:layout,path read-only]
 unit=canvas_ratio_position  base=canvas width (0.5 = center)
 Base ink-bounds center X in normalized canvas coordinates.
ctx.chars[i].geometry.bounds_center_y : number [R:layout,path read-only]
 unit=canvas_ratio_position  axis=y_up  base=canvas height (0.5 = center)
 Base ink-bounds center Y in normalized canvas coordinates.
ctx.chars[i].geometry.bounds_width : number [R:layout,path read-only]
 unit=canvas_ratio_length  base=canvas width
 Base ink-bounds width normalized by canvas width.
ctx.chars[i].geometry.bounds_height : number [R:layout,path read-only]
 unit=canvas_ratio_length  base=canvas height
 Base ink-bounds height normalized by canvas height.
ctx.chars[i].geometry.advance_x : number [R:layout,path read-only]
 unit=canvas_ratio_length  base=canvas width
 Base horizontal advance normalized by canvas width.
ctx.chars[i].geometry.advance_y : number [R:layout,path read-only]
 unit=canvas_ratio_length  axis=y_up  base=canvas height (downward advance is negative)
 Base vertical advance normalized by canvas height, positive upward.
```

### ctx.parts[i].geometry

```text
ctx.parts[i].geometry.local_center_x : number [R:layout,path read-only]
 unit=canvas_ratio_length  base=canvas width
 Part center X relative to its character origin, normalized by canvas width.
ctx.parts[i].geometry.local_center_y : number [R:layout,path read-only]
 unit=canvas_ratio_length  axis=y_up  base=canvas height, measured from the character origin
 Part center Y relative to its character origin, normalized by canvas height and positive upward.
ctx.parts[i].geometry.canvas_center_x : number [R:layout,path read-only]
 unit=canvas_ratio_position  base=canvas width (0.5 = center)
 Part center X in normalized canvas coordinates.
ctx.parts[i].geometry.canvas_center_y : number [R:layout,path read-only]
 unit=canvas_ratio_position  axis=y_up  base=canvas height (0.5 = center)
 Part center Y in normalized canvas coordinates.
ctx.parts[i].geometry.bounds_center_x : number [R:layout,path read-only]
 unit=canvas_ratio_position  base=canvas width (0.5 = center)
 Part ink-bounds center X in normalized canvas coordinates.
ctx.parts[i].geometry.bounds_center_y : number [R:layout,path read-only]
 unit=canvas_ratio_position  axis=y_up  base=canvas height (0.5 = center)
 Part ink-bounds center Y in normalized canvas coordinates.
ctx.parts[i].geometry.bounds_width : number [R:layout,path read-only]
 unit=canvas_ratio_length  base=canvas width
 Part ink-bounds width normalized by canvas width.
ctx.parts[i].geometry.bounds_height : number [R:layout,path read-only]
 unit=canvas_ratio_length  base=canvas height
 Part ink-bounds height normalized by canvas height.
```

### ctx.bounding_box

```text
ctx.bounding_box.enabled : boolean [R:layout,path W:layout]
 Whether the bounding box is drawn.
ctx.bounding_box.draw_top : boolean [R:layout,path W:layout]
 Whether the top edge is drawn.
ctx.bounding_box.draw_bottom : boolean [R:layout,path W:layout]
 Whether the bottom edge is drawn.
ctx.bounding_box.draw_left : boolean [R:layout,path W:layout]
 Whether the left edge is drawn.
ctx.bounding_box.draw_right : boolean [R:layout,path W:layout]
 Whether the right edge is drawn.
ctx.bounding_box.color : MtColor [R:layout,path W:layout]
 Bounding-box stroke color.
ctx.bounding_box.width : number [R:layout,path W:layout]
 unit=font_size_percent  base=100.0 = one font size
 Bounding-box stroke width.
ctx.bounding_box.fill_enabled : boolean [R:layout,path W:layout]
 Whether the bounding box background is filled.
ctx.bounding_box.fill_color : MtColor [R:layout,path W:layout]
 Bounding-box fill color.
ctx.bounding_box.fill_opacity : number [R:layout,path W:layout]
 unit=unit_interval
 Bounding-box fill opacity.
ctx.bounding_box.start_cap : string [R:layout,path W:layout]
 values=butt|square|round|round_rev|triangle|triangle_rev
 Bounding-box stroke start cap.
ctx.bounding_box.end_cap : string [R:layout,path W:layout]
 values=butt|square|round|round_rev|triangle|triangle_rev
 Bounding-box stroke end cap.
ctx.bounding_box.margin_x : number [R:layout,path W:layout]
 unit=font_size_percent  base=100.0 = one font size, horizontal
 Horizontal bounding-box margin.
ctx.bounding_box.margin_y : number [R:layout,path W:layout]
 unit=font_size_percent  axis=y_up  base=100.0 = one font size, vertical
 Vertical bounding-box margin.
ctx.bounding_box.corner_radius : number [R:layout,path W:layout]
 unit=font_size_percent  base=100.0 = one font size
 Bounding-box corner radius.
ctx.bounding_box.fill_offset_x : number [R:layout,path W:layout]
 unit=font_size_percent  base=100.0 = one font size, horizontal
 Horizontal fill offset.
ctx.bounding_box.fill_offset_y : number [R:layout,path W:layout]
 unit=font_size_percent  axis=y_down  base=100.0 = one font size, vertical
 Vertical fill offset; positive moves downward.
ctx.bounding_box.stroke_offset_x : number [R:layout,path W:layout]
 unit=font_size_percent  base=100.0 = one font size, horizontal
 Horizontal stroke offset.
ctx.bounding_box.stroke_offset_y : number [R:layout,path W:layout]
 unit=font_size_percent  axis=y_down  base=100.0 = one font size, vertical
 Vertical stroke offset; positive moves downward.
```

### ctx.output

```text
ctx.output.separation_enabled : boolean [R:layout,path read-only]
 Read-only host output-separation state.
ctx.output.render_mode : string [R:layout,path read-only]
 values=default|separation_1|separation_2
 Read-only host-selected separation output.
ctx.output.targets_1 : string [R:layout,path read-only]
 Read-only host targets assigned to separation output 1.
ctx.output.targets_2 : string [R:layout,path read-only]
 Read-only host targets assigned to separation output 2.
ctx.output.write_on_mode : string [R:layout,path W:layout]
 values=character|part
 Write-on unit.
ctx.output.write_on_start : number [R:layout,path W:layout]
 unit=unit_interval
 Start of the normalized visible write-on range from 0 to 1.
ctx.output.write_on_end : number [R:layout,path W:layout]
 unit=unit_interval
 End of the normalized visible write-on range from 0 to 1.
ctx.output.reorder_parts : boolean [R:layout,path W:layout]
 Whether parts use writing-direction stroke order.
ctx.output.manual_order_enabled : boolean [R:layout,path W:layout]
 Whether manual reveal and draw order is enabled.
ctx.output.manual_order_text : string [R:layout,path W:layout]
 Manual character and part order list.
ctx.output.force_disable_3d_projection : boolean [R:layout,path W:layout]
 Final per-frame override that disables 3D projection and ignores all Inspector and keyframed 3D settings. Set true only for an explicitly 2D-only script.
```

### part

```text
part.index : integer [R:path read-only]
 One-based global part index.
part.character_index : integer [R:path read-only]
 One-based index of the owning character.
part.index_in_character : integer [R:path read-only]
 One-based part index within the owning character.
part.line_index : integer [R:path read-only]
 One-based source layout line index.
part.text : string [R:path read-only]
 Text represented by the owning shaped character cluster.
part.path : MtDrawingPath [R:path read-only]
 Mutable path initialized from the original glyph part and committed atomically after OnPath succeeds.
```

### info

```text
info.progress : number [R:layout,path read-only]
 unit=unit_interval
 Normalized position within the filtered set, following the order option.
info.n : integer [R:layout,path read-only]
 One-based counter within the filtered set. Differs from the yielded index whenever a filter is active.
info.count : integer [R:layout,path read-only]
 Number of elements in the filtered set (at least 1).
info.first : boolean [R:layout,path read-only]
 True on the first iteration of the filtered set.
info.last : boolean [R:layout,path read-only]
 True on the last iteration of the filtered set.
info.char : MtCharacter [R:layout,path read-only]
 mt.each_part only: the character owning this part.
info.char_index : integer [R:layout,path read-only]
 mt.each_part only: one-based index of the owning character in ctx.chars.
info.index_in_char : integer [R:layout,path read-only]
 mt.each_part only: one-based part index within the owning character.
```

### ctx.paths

```text
ctx.paths.units_per_em : number [R:path read-only]
 unit=path_units  base=em (always 1000)
 Normalized path coordinate scale. Always 1000 units per em.
ctx.paths:part(index) -> MtPathPart|nil [R:path read-only]
 Lazily get one part by its one-based global part index, or nil when absent.
ctx.paths:character(index) -> MtPathPart[] [R:path read-only]
 Lazily get every part owned by one one-based character index.
ctx.paths:shape(number) -> MtPathPart[] [R:path read-only]
 Lazily get the part of one shape by its one-based shape number; the array is empty when no such shape exists.
ctx.paths:select(selector) -> MtPathPart[] [R:path read-only]
 Lazily select parts with the character/part selector grammar, ordered by global part index.
```

### MtDrawingPath

```text
MtDrawingPath:clear() -> nil [R:all read-only]
 Remove every command from this path.
MtDrawingPath:assign(template) -> nil [R:all read-only]
 Replace this path with a compiled mt.svg_path template.
MtDrawingPath:set_svg(source) -> nil [R:all read-only]
 Parse and replace this path from SVG path data in normalized 1000-units-per-em coordinates.
MtDrawingPath:move_to(x, y) -> nil [R:all read-only]
 Start a subpath at an absolute normalized local coordinate.
MtDrawingPath:line_to(x, y) -> nil [R:all read-only]
 Append a straight line to an absolute normalized local coordinate.
MtDrawingPath:quad_to(cx, cy, x, y) -> nil [R:all read-only]
 Append a quadratic Bezier segment.
MtDrawingPath:cubic_to(cx1, cy1, cx2, cy2, x, y) -> nil [R:all read-only]
 Append a cubic Bezier segment.
MtDrawingPath:close() -> nil [R:all read-only]
 Close the current subpath.
MtDrawingPath:bounds() -> number, number, number, number|nil [R:all read-only]
 Return tight path bounds as minimum X, minimum Y, maximum X, and maximum Y; an empty path returns nil.
MtDrawingPath:map_points(callback) -> nil [R:all read-only]
 Atomically replace every anchor and control point with coordinates returned by a callback while preserving path topology.
```

### point

```text
point.index : integer [R:all read-only]
 One-based point index across the path.
point.command_index : integer [R:all read-only]
 One-based logical command index.
point.contour_index : integer [R:all read-only]
 One-based contour index.
point.role : string [R:all read-only]
 values=anchor|control1|control2
 Point role within the logical command.
point.command : string [R:all read-only]
 values=move|line|quad|cubic
 Logical command containing this point.
```

### ctx.glyphs

```text
ctx.glyphs:declare(declaration) -> string [R:pre read-only]
 Declare one custom glyph and return its placeholder; path uses Y-down drawing coordinates, while bounds and advances use Y-up layout coordinates.
```

### ctx.shapes

```text
ctx.shapes:declare(declaration) -> integer [R:pre read-only]
 Declare one shape and return its one-based number; path uses Y-down drawing coordinates in normalized em units around the shape position, and layer is "back" (default) or "front", parent is the number of an earlier shape to place this one relative to, and camera is the number of a camera from ctx.shape_cameras:declare that projects this shape in 3D (a child takes its parent's camera, naming a different one is an error, and a child of a shape with no camera cannot name one; none leaves the shape fixed to the canvas).
```

### ctx.shapes[i]

```text
ctx.shapes[i].index : integer [R:layout,path read-only]
 One-based shape number: the one ctx.shapes[number] and ctx.shapes:declare return.
ctx.shapes[i].parent : integer [R:layout,path read-only]
 One-based number of the shape this one is placed relative to, as given to ctx.shapes:declare; 0 when it has no parent.
ctx.shapes[i].camera : integer [R:layout,path read-only]
 One-based number of the shape camera that projects this shape, as given to ctx.shapes:declare or taken from its parent; 0 when it has none and stays fixed to the canvas.
ctx.shapes[i].offset_x : number [R:layout,path W:layout]
 unit=canvas_ratio_displacement  neutral=0.5  base=canvas width
 Shape X offset; 0.5 is no displacement.
ctx.shapes[i].offset_y : number [R:layout,path W:layout]
 unit=canvas_ratio_displacement  neutral=0.5  axis=y_up  base=canvas height
 Shape Y offset; 0.5 is no displacement and values grow upward.
ctx.shapes[i].pivot_x : number [R:layout,path W:layout]
 unit=canvas_ratio_displacement  neutral=0.5  base=canvas width, measured from the shape position
 Pivot X displacement from the shape position, in canvas-normalized units; 0.5 means zero displacement.
ctx.shapes[i].pivot_y : number [R:layout,path W:layout]
 unit=canvas_ratio_displacement  neutral=0.5  axis=y_up  base=canvas height, measured from the shape position
 Pivot Y displacement from the shape position, in canvas-normalized units; 0.5 means zero displacement and values grow upward.
ctx.shapes[i].scale : number [R:layout,path W:layout]
 unit=multiplier  neutral=1  range=0.001..+inf
 Uniform scale across the shape's plane (x and y); it does not scale depth, so a rotated child under a scaled parent shears.
ctx.shapes[i].stretch_x : number [R:layout,path W:layout]
 unit=multiplier  neutral=1  base=horizontal
 Horizontal shape stretch.
ctx.shapes[i].stretch_y : number [R:layout,path W:layout]
 unit=multiplier  neutral=1  base=vertical
 Vertical shape stretch.
ctx.shapes[i].rotation : number [R:layout,path W:layout]
 unit=degrees  neutral=0  axis=clockwise_positive
 Shape rotation in degrees. Positive turns clockwise: 90 makes what pointed up point right.
ctx.shapes[i].z : number [R:layout,path W:layout]
 unit=canvas_ratio_length  neutral=0  axis=z_into_screen  base=positive = deeper/away from camera
 Z position along the view direction, in the parent's space; positive is farther from the camera. Acts only on a shape that has a shape camera.
ctx.shapes[i].yaw : number [R:layout,path W:layout]
 unit=degrees  neutral=0  axis=object_yaw  base=+ turns the right edge toward the viewer (-Z)
 Yaw in degrees, applied after pitch and before the in-plane rotation. Acts only on a shape that has a shape camera.
ctx.shapes[i].pitch : number [R:layout,path W:layout]
 unit=degrees  neutral=0  axis=object_pitch  base=+ turns the top edge toward the viewer (-Z)
 Pitch in degrees, applied before yaw and the in-plane rotation. Acts only on a shape that has a shape camera.
ctx.shapes[i].opacity : number [R:layout,path W:layout]
 unit=unit_interval  neutral=1
 Shape opacity multiplier in the range 0 to 1 applied to the resolved fill, gradient, stroke, and shadow.
ctx.shapes[i].z_index : number [R:layout,path W:layout]
 unit=unitless  neutral=0
 Paint order key within the shape's layer: a higher value is drawn later, in front of the lower ones, and equal values keep declaration order. It never moves a shape across the text.
ctx.shapes[i].fill : MtIndividualFill [R:layout,path W:layout]
 Individual fill color override.
ctx.shapes[i].stroke : MtIndividualStroke [R:layout,path W:layout]
 Individual stroke override.
ctx.shapes[i].shadow : MtIndividualShadow [R:layout,path W:layout]
 Individual shadow color and blur override.
ctx.shapes[i].texture : MtTexture [R:layout,path W:layout]
 Individual texture override; script-only (no host parameter group backs it), so it always reads as unused/default unless a script sets it.
ctx.shapes[i].blur : MtBlur [R:layout,path W:layout]
 Individual blur of the text itself (fill, gradient, texture, stroke, crayon); script-only (no host parameter group backs it), so it always reads as unused/default unless a script sets it.
ctx.shapes[i].path : MtDrawingPath [R:layout read-only]
 The shape outline in normalized em units around the shape position. It starts as the declared path and is edited in place, for example with path:assign.
```

### ctx.shape_cameras

```text
ctx.shape_cameras:declare() -> integer [R:pre read-only]
 Declare one camera for shapes and return its one-based number. A camera starts at the default values of the text's camera and is moved by writing ctx.shape_cameras[number] in OnLayout; a shape names it with ctx.shapes:declare({ camera = number }).
```

### ctx.shape_cameras[i]

```text
ctx.shape_cameras[i].target_x : number [R:layout W:layout]
 unit=canvas_ratio_position  base=canvas width (0.5 = center)
 Camera target X in host-normalized coordinates.
ctx.shape_cameras[i].target_y : number [R:layout W:layout]
 unit=canvas_ratio_position  axis=y_up  base=canvas height (0.5 = center)
 Camera target Y in host-normalized coordinates; values grow upward.
ctx.shape_cameras[i].yaw : number [R:layout W:layout]
 unit=degrees  neutral=0  axis=camera_orbit  base=+ orbits the camera to the RIGHT of the target (subject appears to turn left)
 Camera orbit yaw in degrees.
ctx.shape_cameras[i].pitch : number [R:layout W:layout]
 unit=degrees  neutral=0  axis=camera_orbit  base=+ orbits the camera UP (looking down at the subject)
 Camera orbit pitch in degrees.
ctx.shape_cameras[i].perspective : number [R:layout W:layout]
 unit=perspective_strength  range=0..1  base=distancePx = f(perspective) * canvas.height; larger = camera closer
 Perspective strength.
ctx.shape_cameras[i].zoom : number [R:layout W:layout]
 unit=multiplier  neutral=1  range=0.001..+inf
 Camera zoom multiplier.
ctx.shape_cameras[i].lens_shift_x : number [R:layout W:layout]
 unit=canvas_ratio_length  neutral=0  base=canvas width
 Horizontal lens shift as a canvas fraction.
ctx.shape_cameras[i].lens_shift_y : number [R:layout W:layout]
 unit=canvas_ratio_length  neutral=0  axis=y_up  base=canvas height
 Vertical lens shift as a canvas fraction; values grow upward.
```

### ctx.global.blur / ctx.chars[i].blur / ctx.parts[i].blur

```text
ctx.global.blur / ctx.chars[i].blur / ctx.parts[i].blur.use : boolean [R:layout,path W:layout]
 Whether this element's own blur is used instead of the inherited one. Ignored on ctx.global.
ctx.global.blur / ctx.chars[i].blur / ctx.parts[i].blur.amount_x : number [R:pre,layout,path W:pre,layout]
 unit=em  neutral=0  range=0..10  base=font size (1.0 = 1 em)
 Horizontal blur of the text, as a Gaussian sigma in em (1.0 = one font size). 0 leaves the horizontal edges sharp.
ctx.global.blur / ctx.chars[i].blur / ctx.parts[i].blur.amount_y : number [R:pre,layout,path W:pre,layout]
 unit=em  neutral=0  range=0..10  base=font size (1.0 = 1 em)
 Vertical blur of the text, as a Gaussian sigma in em (1.0 = one font size). 0 leaves the vertical edges sharp.
ctx.global.blur / ctx.chars[i].blur / ctx.parts[i].blur.glow : number [R:pre,layout,path W:pre,layout]
 unit=unitless  neutral=0  range=0..10
 Glow strength of the blurred text: it brightens the blur into a glow and has no effect while the text is not blurred (0 = no glow).
```

### ctx.global.texture / ctx.chars[i].texture / ctx.parts[i].texture

```text
ctx.global.texture / ctx.chars[i].texture / ctx.parts[i].texture.use : boolean [R:layout,path W:layout]
 Whether this element's own texture is used instead of the inherited one. Ignored on ctx.global.
ctx.global.texture / ctx.chars[i].texture / ctx.parts[i].texture.type : string [R:pre,layout,path W:pre,layout]
 values=none|water_droplet|air_cushion|glitter|iridescent|faceted|stained_glass|metallic|metallic_2
 Fill material; none paints the plain fill.
ctx.global.texture / ctx.chars[i].texture / ctx.parts[i].texture.p1 : number [R:pre,layout,path W:pre,layout]
 unit=unitless
 First shared material control; 0..1 for every type. Its meaning follows texture.type (water_droplet thickness, air_cushion inflation, glitter flake size where 0 removes the flakes, iridescent film thickness, faceted facet count, stained_glass piece size relative to the untransformed character, metallic and metallic_2 polish where 0 is matte and 1 is a mirror). Out-of-range values are clamped when drawn; the stored value is unchanged.
ctx.global.texture / ctx.chars[i].texture / ctx.parts[i].texture.p2 : number [R:pre,layout,path W:pre,layout]
 unit=unitless
 Second shared material control; 0..1 for every type (water_droplet roundness, air_cushion seal width, glitter highlight ratio, iridescent hue range, faceted bevel depth, stained_glass lead width; 0 removes the lead; metallic and metallic_2 relief).
ctx.global.texture / ctx.chars[i].texture / ctx.parts[i].texture.p3 : number [R:pre,layout,path W:pre,layout]
 unit=unitless
 Third shared material control; 0..1 for every type (water_droplet gloss, air_cushion wrinkles, glitter flake amount, iridescent strength, faceted polish, stained_glass hue range, metallic reflection contrast, metallic_2 exposure where 0.5 is the neutral studio). Glitter flake amount is 0 for no flakes and 1 for full density; its hue spread is fixed at full range around texture.color. Stained glass hue range spreads from the fill underneath.
ctx.global.texture / ctx.chars[i].texture / ctx.parts[i].texture.p4 : number [R:pre,layout,path W:pre,layout]
 unit=unitless
 Fourth shared material control. Light angles (water_droplet, air_cushion, glitter, iridescent, faceted, metallic, metallic_2) are degrees and wrap; stained_glass glow is 0..1 whose midpoint 0.5 is plain glass, above it the panes emit and below it they darken.
ctx.global.texture / ctx.chars[i].texture / ctx.parts[i].texture.color : MtColor [R:pre,layout,path W:pre,layout]
 Tints the light the material adds on top of the fill; white leaves it untinted. Glitter uses it as the metal colour and stained_glass as the lead colour; iridescent ignores it. Metallic and metallic_2 use it as the light colour and take the metal colour from the fill.
```

### color value

```text
color value.r : number [R:pre,layout,path W:pre,layout]
 unit=unit_interval
 Red channel in the range 0 to 1.
color value.g : number [R:pre,layout,path W:pre,layout]
 unit=unit_interval
 Green channel in the range 0 to 1.
color value.b : number [R:pre,layout,path W:pre,layout]
 unit=unit_interval
 Blue channel in the range 0 to 1.
color value.a : number [R:pre,layout,path W:pre,layout]
 unit=unit_interval
 Alpha channel in the range 0 to 1.
```

## 14. mt.* utility reference

All `mt.*` members are readable in every callback. Signatures list parameter names only.

### mt.*

```text
mt.storage : table
 Deprecated frozen storage; the Lua state persists across frames, so hold values in a local at chunk scope instead. DEPRECATED.
mt.ease : MtEase
 Easing function namespace.
mt.color : MtColorUtilities
 Color construction and interpolation namespace.
mt.shadow : MtShadowUtilities
 Shadow inheritance helper namespace.
mt.blur : MtBlurUtilities
 Text blur inheritance helper namespace.
mt.stroke : MtStrokeUtilities
 Stroke inheritance helper namespace.
mt.texture : MtTextureUtilities
 Texture inheritance helper namespace.
mt.layout : MtLayoutUtilities
 Layout and typesetting helper namespace.
mt.path : MtPathUtilities
 Closed-form motion path evaluation namespace.
mt.svg_path(source, optionsOrSourceUnitsPerEm?) -> MtDrawingPath
 Compile SVG path data into an immutable normalized template. Accepts source units per em, or { view_box, em_scale } where em_scale 1.0 fits the view box to one em.
mt.drawing_path() -> MtDrawingPath
 Create an empty mutable drawing path in normalized 1000-units-per-em local coordinates.
mt.timeline : MtTimelineUtilities
 Timeline progress and interpolation namespace.
mt.text : MtTextUtilities
 UTF-8 safe text processing namespace.
mt.target : MtTargetUtilities
 Character and part selection-string namespace.
mt.CHAR : integer
 Character kind flag for target and order entries; combine it with a one-based character index.
mt.PART : integer
 Part kind flag for target and order entries; combine it with a one-based global part index.
mt.NOT : integer
 Exclusion flag reserved for target entries; mt.order_text rejects it.
mt.clamp(value, low, high) -> number
 Clamp a value into a range.
mt.saturate(value) -> number
 Clamp a value to the range 0 through 1.
mt.lerp(from, to, t) -> number
 Linearly interpolate between two values.
mt.inverse_lerp(from, to, value) -> number
 Return the interpolation factor of a value between two endpoints.
mt.remap(value, inLow, inHigh, outLow, outHigh, clamped?) -> number
 Map a value between ranges.
mt.wrap(value, boundaryA, boundaryB) -> number
 Wrap a value into the half-open interval between two boundaries, regardless of their order.
mt.lerp_angle(from, to, t) -> number
 Interpolate degrees along the shortest angular path.
mt.distribute(index, count) -> number
 Map a one-based index evenly across 0 through 1.
mt.order_text(entries) -> string
 Convert encoded character and part indices into validated manual-order text while preserving input order.
mt.each_char(ctx, options?) -> function
 Iterate shaped characters with optional filtering. Yields the ctx.chars index, the character, and a reusable info table with progress, n, count, first and last. Options: from, to (index range), line (line_index filter), order ('asc'|'desc'|'center'|'random') selecting how info.progress spans 0 through 1, seed for the random order. info is reused every iteration: copy values out to keep them.
mt.each_part(ctx, options?) -> function
 Iterate shaped parts with optional filtering. Yields the ctx.parts index, the part, and a reusable info table that also resolves char, char_index and index_in_char. Adds from_char and to_char, keeping only parts whose owning character index falls in that range; they intersect with from and to. info.progress spans the whole filtered set and does not restart on character boundaries.
mt.falloff(distance, radius) -> number
 Smooth bell-shaped influence weight: 1 at the centre, easing toward 0 with distance.
mt.polar_offset(angleDegrees, radius) -> number, number
 Deprecated screen-oriented polar vector, whose Y must be negated before it reaches offset_y; use polar_offset_2d. DEPRECATED.
mt.polar_offset_2d(angleDegrees, radius) -> number, number
 Converts a polar direction (degrees) and radius into a Y-up canvas offset pair, ready to add to offset_x and offset_y.
mt.smoothstep(edge0, edge1, value) -> number
 Smooth Hermite transition across a range.
mt.cycle(t, period) -> number
 Repeating 0 to 1 ramp.
mt.pingpong(t, period) -> number
 Repeating 0 to 1 to 0 motion.
mt.stagger(time, index, delay, duration) -> number
 Per-index staggered progress in the range 0 to 1.
mt.stagger_progress(progress, position, span) -> number
 Spread an existing normalized progress across element positions while ensuring every element finishes at progress 1.
mt.keyframes(keys, time) -> number|color
 Closed-form piecewise keyframe interpolation over number or color keys with optional per-segment easing.
mt.stagger_pattern(time, index, count, pattern, delay, duration, seed?) -> number
 Staggered progress with configurable directional patterns. 'random' assigns a duplicate-free shuffled rank, so delays stay evenly spaced.
mt.random(seed, index, channel?) -> number
 Stable order-independent random value with an optional named channel.
mt.random_range(seed, index, low, high, channel?) -> number
 Stable random value in a requested range with an optional named channel.
mt.distributed_random(seed, index, count, low, high, channel?) -> number
 Assign one of count evenly spaced values in a stable seeded permutation.
mt.noise1(x, seed?) -> number
 Deterministic smooth one-dimensional value noise.
mt.noise2(x, y, seed?) -> number
 Deterministic smooth two-dimensional value noise.
mt.spring(t, frequency, damping) -> number
 Damped oscillation from 1 toward 0 (may go negative while overshooting). Intended for residual displacement, not raw 0–1 progress.
mt.wave(t, frequency, phase?) -> number
 Sine wave shorthand.
mt.wave_square(t, frequency, phase?) -> number
 Square wave shorthand (returns -1.0 or 1.0).
mt.wave_triangle(t, frequency, phase?) -> number
 Triangle wave shorthand.
mt.wave_sawtooth(t, frequency, phase?) -> number
 Sawtooth wave shorthand.
mt.wiggle(time, frequency, amplitude, octaves?, seed?) -> number
 Deterministic layered value-noise wiggle; amplitude is the first octave's amplitude, not the summed maximum.
mt.bounce_y(paramsOrT, groundY, startY, gravity, restitution, startVelocity, squashStrength, stretchStrength, flexibility, damping) -> table|number
 Closed-form 1D ballistic bounce calculation against a ground plane with continuous Squash & Stretch.
mt.bounce_x(paramsOrT, wallX, startX, acceleration, restitution, startVelocity, squashStrength, stretchStrength, flexibility, damping) -> table|number
 Closed-form 1D ballistic bounce calculation against a vertical wall plane with continuous Squash & Stretch.
mt.bounce_ground(ctx, item, groundY, config?) -> table
 Convenience API: Bounces a character or part item against a ground Canvas plane, automatically computing and applying offset_y, stretch_x, and stretch_y.
mt.bounce_wall(ctx, item, wallX, config?) -> table
 Convenience API: Bounces a character or part item against a vertical wall Canvas plane, automatically computing and applying offset_x, stretch_x, and stretch_y.
mt.impact_squash(params) -> number, number, number
 Closed-form squash-and-stretch impulse for collision events.
mt.projectile_2d(paramsOrT, speed, angleDegrees, gravity, spin, drag) -> table|number
 Closed-form 2D ballistic flight from a launch velocity under gravity, with optional spin and drag.
mt.friction_decay(t, speed, friction) -> number, number
 Closed-form exponential deceleration: distance travelled and remaining speed under friction.
```

### mt.color.*

```text
mt.color.resolve_fill(ctx, target, options?) -> MtColor, string, number
 Resolve the fill color, mode and object opacity of a character or part. With no options this is the final fill; options.level stops the inheritance at an earlier tier.
mt.color.lerp(from, to, t) -> MtColor
 Interpolate two RGBA color tables.
mt.color.from_hsv(hue, saturation, value, alpha?) -> MtColor
 Create an RGBA color from normalized HSV components.
mt.color.with_alpha(color, alpha) -> MtColor
 Copy a color while replacing its alpha channel.
mt.color.from_oklch(lightness, chroma, hue, alpha?) -> MtColor
 Create an RGBA color from OKLCH components.
mt.color.from_oklab(lightness, aAxis, bAxis, alpha?) -> MtColor
 Create an RGBA color from OKLab components.
mt.color.to_oklab(color) -> { lightness, a, b, alpha }
 Convert an RGBA color to { lightness, a, b, alpha } OKLab components.
mt.color.to_oklch(color) -> { lightness, chroma, hue, alpha }
 Convert an RGBA color to { lightness, chroma, hue, alpha } OKLCH components.
mt.color.from_okhsv(hue, saturation, value, alpha?) -> MtColor
 Create an RGBA color from gamut-normalized OKHSV components.
mt.color.to_okhsv(color) -> { hue, saturation, value, alpha }
 Convert an RGBA color to { hue, saturation, value, alpha } OKHSV components.
mt.color.from_okhsl(hue, saturation, lightness, alpha?) -> MtColor
 Create an RGBA color from gamut-normalized OKHSL components.
mt.color.to_okhsl(color) -> { hue, saturation, lightness, alpha }
 Convert an RGBA color to { hue, saturation, lightness, alpha } OKHSL components.
mt.color.lerp_oklab(from, to, t) -> MtColor
 Interpolate two RGBA colors in OKLab space.
mt.color.lerp_oklch(from, to, t, hueMethod?) -> MtColor
 Interpolate two RGBA colors in OKLCH space along the short (default) or long hue path.
mt.color.lerp_okhsv(from, to, t) -> MtColor
 Interpolate two RGBA colors in OKHSV space along the shortest hue path.
mt.color.lerp_okhsl(from, to, t) -> MtColor
 Interpolate two RGBA colors in OKHSL space along the shortest hue path.
```

### mt.shadow.*

```text
mt.shadow.resolve(ctx, target, options?) -> MtResolvedShadow
 Resolve the shadow (color, blur_x, blur_y in em, and glow) of a character or part. With no options this is the final shadow it is drawn with; options.level stops the inheritance at an earlier tier. shadow.use switches color, blur and glow together, so to override one of them read the tier above and write the other back.
```

### mt.blur.*

```text
mt.blur.resolve(ctx, target, options?) -> MtResolvedBlur
 Resolve the blur of the text itself (amount_x and amount_y in em, and glow) of a character or part. With no options this is the final blur; options.level stops the inheritance at an earlier tier.
```

### mt.stroke.*

```text
mt.stroke.resolve(ctx, target, options?) -> MtResolvedStroke
 Resolve the stroke (width, gap, color, outer_width and outer_color) of a character or part. With no options this is the final stroke; options.level stops the inheritance at an earlier tier. order, join and miter_limit exist only on ctx.global.stroke.
```

### mt.texture.*

```text
mt.texture.resolve(ctx, target, options?) -> MtResolvedTexture
 Resolve the texture (type, p1 to p4 and color) of a character or part. With no options this is the final texture; options.level stops the inheritance at an earlier tier.
```

### mt.ease.*

```text
mt.ease.linear(t) -> number
 Apply linear easing.
mt.ease.in_quad(t) -> number
 Apply in_quad easing.
mt.ease.out_quad(t) -> number
 Apply out_quad easing.
mt.ease.in_out_quad(t) -> number
 Apply in_out_quad easing.
mt.ease.in_cubic(t) -> number
 Apply in_cubic easing.
mt.ease.out_cubic(t) -> number
 Apply out_cubic easing.
mt.ease.in_out_cubic(t) -> number
 Apply in_out_cubic easing.
mt.ease.in_quart(t) -> number
 Apply in_quart easing.
mt.ease.out_quart(t) -> number
 Apply out_quart easing.
mt.ease.in_out_quart(t) -> number
 Apply in_out_quart easing.
mt.ease.in_sine(t) -> number
 Apply in_sine easing.
mt.ease.out_sine(t) -> number
 Apply out_sine easing.
mt.ease.in_out_sine(t) -> number
 Apply in_out_sine easing.
mt.ease.in_circ(t) -> number
 Apply in_circ easing.
mt.ease.out_circ(t) -> number
 Apply out_circ easing.
mt.ease.in_out_circ(t) -> number
 Apply in_out_circ easing.
mt.ease.in_expo(t) -> number
 Apply in_expo easing.
mt.ease.out_expo(t) -> number
 Apply out_expo easing.
mt.ease.in_out_expo(t) -> number
 Apply in_out_expo easing.
mt.ease.in_back(t) -> number
 Apply in_back easing.
mt.ease.out_back(t) -> number
 Apply out_back easing.
mt.ease.in_out_back(t) -> number
 Apply in_out_back easing.
mt.ease.in_elastic(t) -> number
 Apply in_elastic easing.
mt.ease.out_elastic(t) -> number
 Apply out_elastic easing.
mt.ease.in_out_elastic(t) -> number
 Apply in_out_elastic easing.
mt.ease.in_bounce(t) -> number
 Apply in_bounce easing.
mt.ease.out_bounce(t) -> number
 Apply out_bounce easing.
mt.ease.in_out_bounce(t) -> number
 Apply in_out_bounce easing.
mt.ease.cubic_bezier(x1, y1, x2, y2, t) -> number
 Apply a CSS-compatible cubic Bezier easing curve.
```

### mt.layout.*

```text
mt.layout.reflow(ctx, gap?, config?) -> void
 Reflows characters from exact horizontal or vertical typesetting origins while preserving shaped spacing and applying current scale/stretch; skipped targets contribute advances without being moved.
mt.layout.place_2d(ctx, item, canvasX, canvasY) -> number, number
 Places a character, part or shape anchor at an exact pre-3D canvas point through the complete global/character/part 2D hierarchy (a shape sits outside the Global).
mt.layout.get_canvas_position_2d(ctx, item) -> number, number
 Calculates the exact current pre-3D canvas position (canvasX, canvasY) of a character, part or shape anchor.
mt.layout.radial_distance(ctx, canvasX, canvasY, centerX?, centerY?) -> number
 Aspect-corrected distance from a canvas point to the centre of a radial effect.
mt.layout.canvas_to_offset_2d(ctx, item, canvasX, canvasY) -> number, number
 Calculates the relative offset_x and offset_y required to place a character, part or shape anchor at an exact pre-3D canvas position (canvasX, canvasY) without mutating item properties.
mt.layout.measure_bounds_2d(ctx, targets?, targetType?, space?) -> table|nil
 Returns axis-aligned bounds of transformed natural part boxes after the complete 2D hierarchy and before 3D, projection, and deformation. Omit targets to measure every character or part. space=before_global_rotation measures in Canvas coordinates with Global rotation removed around its position-plus-pivot; all other transforms remain.
mt.layout.queue_on_path(ctx, path, options?) -> number[]
 Distributes characters or parts along an arc-length path in reading order, spaced by their own natural advances, and returns the normalized distance ratio each item occupies.
mt.layout.group_by_line(ctx) -> MtLayoutLineGroup[]
 Groups shaped characters by line_index in reading order; vertical-writing lines represent columns.
mt.layout.pivot_at_2d(ctx, item, anchor) -> void
 Sets a semantic 2D bounds or writing-origin pivot on a character or part while preserving its current pre-3D pose.
mt.layout.match_pose(ctx, destination, source, options?) -> void
 Copy the current pose from a source character or part to a compatible destination, with em-based position deltas following the complete source-local pose hierarchy. match_bounds falls back from empty ink bounds to the logical character cell.
mt.layout.retypeset(ctx, gap?, config?) -> void
 Deprecated approximate re-typesetting; use reflow. DEPRECATED.
mt.layout.canvas_to_offset(resolvedGlobal, canvasWidth, canvasHeight, naturalCenterX, naturalCenterY, canvasX, canvasY) -> number, number
 Deprecated global-only inverse conversion; use place_2d. DEPRECATED.
mt.layout.set_canvas_position(item, canvasX, canvasY, ctx?) -> number, number
 Deprecated partial canvas placement; use place_2d. DEPRECATED.
mt.layout.group_bounds(ctx, targets, targetType?) -> table|nil
 Deprecated approximate bounds; use measure_bounds_2d. DEPRECATED.
```

### mt.path.*

```text
mt.path.bezier(p0, p1, p2, p3, t) -> number, number, number, number
 Evaluates a point and its tangent (raw derivative, not normalized) on a cubic Bezier curve defined by 4 control points.
mt.path.catmull_rom(points, t) -> number, number, number, number
 Evaluates a point and its tangent (raw derivative, not normalized) on a Catmull-Rom spline through an array of points; t is normalized over the whole path (0 at the first point, 1 at the last).
mt.path.arc_length(points, aspectRatio?, options?) -> MtArcLengthPath
 Builds an arc-length parameterized path from control points so items can be placed by distance instead of by curve parameter t. Returns an MtArcLengthPath exposing length() and at_distance(distanceRatio).
```

### path:*

```text
path:length() -> number
 Total path length in aspect-corrected canvas units. Called with a colon, as path:length().
path:at_distance(distanceRatio) -> number, number, number
 Position and heading at a normalized distance along the path, where 0 is the start and 1 is the end, measured by distance rather than by curve parameter. Returns x, y, and a heading in degrees already converted to the screen convention. Called with a colon, as path:at_distance(ratio).
```

### mt.timeline.*

```text
mt.timeline.progress(ctx, fallbackDuration?) -> number
 Returns the host timeline progress, falling back to a looping progress if unavailable.
mt.timeline.duration(ctx, fallbackDuration?) -> number
 Returns a finite positive host clip duration, or a fallback when no usable host duration is available.
mt.timeline.remaining(ctx, fallbackDuration?) -> number
 Remaining seconds until the clip end, using a looping fallback duration when the host timeline is unavailable.
mt.timeline.intro_outro_seconds(ctx, introSeconds, outroSeconds, fallbackDuration?) -> number, number
 Real-time intro and outro progress anchored to the clip head and tail, compressed proportionally when the clip is shorter than the requested seconds.
mt.timeline.window_progress(ctx, start, duration) -> number
 Returns linear progress through a context-local time window, clamped to 0 before the window and 1 after it.
mt.timeline.chain(ctx, initialValue, segments, options?) -> any
 Evaluates duration-based pure-function segments with a segment-local context, passing each completed segment's final return value to the next and supporting fixed or remaining-span holds.
mt.timeline.window_ctx(ctx, start, duration) -> table
 Creates a derived context whose time, frame, duration, and progress are remapped to a clamped local time window.
mt.timeline.intro_outro(progress, introFraction, outroFraction) -> number, number
 Deprecated: fraction-based transitions stretch with the clip length; use intro_outro_seconds. DEPRECATED.
```

### mt.target.*

```text
mt.target.chars(ctx, specification, options?) -> integer[]
 Resolve a character/part selection string (the grammar of the host's character and part target settings: c3, p2, 5, 2-4, !c1) to ascending character numbers; a bare number is a character, and a character is listed when any of its parts is selected. options.empty is 'none' (default) or 'all' for a string that selects nothing.
mt.target.parts(ctx, specification, options?) -> integer[]
 Resolve a character/part selection string (the grammar of the host's character and part target settings: c3, p2, 5, 2-4, !c1) to ascending global part numbers; a bare number is a part. options.empty is 'none' (default) or 'all' for a string that selects nothing.
```

### mt.text.*

```text
mt.text.slice(text, startChar, endChar?) -> string
 Slice a UTF-8 string by code-point indices; this is not grapheme-cluster aware.
mt.text.classify(text) -> string
 Classifies the first Unicode code point of a text cluster as Japanese script, punctuation, Latin, digit, space, or other.
```

## 15. mt.* full reference

Per-function argument types, units, defaults, permitted values and error
conditions. Jump to a function's `#### ` heading when you know its name;
start from Index by Purpose when you only know the goal. Do not read end to end.

### Index by Purpose

- Value constraints and range mapping : `mt.clamp` / `mt.saturate` / `mt.remap` / `mt.wrap`
- Interpolation and keyframes : `mt.lerp` / `mt.inverse_lerp` / `mt.lerp_angle` / `mt.smoothstep` / `mt.keyframes`
- Progress distribution (domino, cascade, typewriter) : `mt.distribute` / `mt.stagger` / `mt.stagger_progress` / `mt.stagger_pattern`
- Manual drawing and Write On order : `mt.order_text` / `mt.CHAR` / `mt.PART` / `mt.NOT`
- Distance-based influence (wavefront, shine, ripple, shockwave) : `mt.falloff`
- Deterministic random values and noise (scatter, camera shake, tremor) : `mt.random` / `mt.random_range` / `mt.distributed_random` / `mt.noise1` / `mt.noise2` / `mt.wiggle`
- Cycles and springs (floating, harmonic wave, damped oscillation) : `mt.cycle` / `mt.pingpong` / `mt.wave` / `mt.wave_square` / `mt.wave_triangle` / `mt.wave_sawtooth` / `mt.spring`
- Displacement from polar coordinates (radial scatter, orbit, explosion) : `mt.polar_offset_2d`
- Physical motion (ballistic trajectory, ground bounce, friction decay) : `mt.bounce_y` / `mt.bounce_x` / `mt.bounce_ground` / `mt.bounce_wall` / `mt.impact_squash` / `mt.projectile_2d` / `mt.friction_decay`
- Color (hue shift, interpolation, perceptually uniform) : `mt.color.resolve_fill` / `mt.color.from_*` / `mt.color.to_*` / `mt.color.lerp*` / `mt.color.with_alpha`
- Resolved shadow, blur, stroke and texture of an element (read the value inherited from a higher tier) : `mt.shadow.resolve` / `mt.blur.resolve` / `mt.stroke.resolve` / `mt.texture.resolve`
- Easing : `mt.ease.*`
- Reflow and line-based grouping : `mt.layout.reflow` / `mt.layout.group_by_line`
- Canvas position, distance, and pivot : `mt.layout.place_2d` / `mt.layout.get_canvas_position_2d` / `mt.layout.canvas_to_offset_2d` / `mt.layout.radial_distance` / `mt.layout.pivot_at_2d`
- Bounds after 2D transforms : `mt.layout.measure_bounds_2d`
- Alignment on paths : `mt.layout.queue_on_path`
- Motion paths : `mt.path.bezier` / `mt.path.catmull_rom` / `mt.path.arc_length`
- Path creation and editing : `mt.svg_path` / `path:*`
- UTF-8 text processing : `mt.text.slice` / `mt.text.classify`
- Character and part selection strings : `mt.target.chars` / `mt.target.parts`
- Clip time : `mt.timeline.progress` / `mt.timeline.duration` / `mt.timeline.remaining` / `mt.timeline.intro_outro_seconds` / `mt.timeline.window_progress` / `mt.timeline.window_ctx` / `mt.timeline.chain`

### 1. Value Constraints and Range Mapping

#### `mt.clamp(value, low, high)`

Constrains a value to the closed interval `[low, high]`.

ARGS
- `value` (`number`) Value to constrain
- `low` (`number`) Lower bound
- `high` (`number`) Upper bound

RET
- `number` -- Constrained value

#### `mt.saturate(value)`

Shorthand for `mt.clamp(value, 0.0, 1.0)`. Use it to keep progress or alpha values within 0–1.

ARGS
- `value` (`number`) Value to constrain to 0–1

RET
- `number` 0–1 -- Value constrained to 0–1

#### `mt.remap(value, in_low, in_high, out_low, out_high, clamped?)`

Maps a value from an input interval to an output interval. Use it for general interval conversions, such as converting seconds into progress.

ARGS
- `value` (`number`) Value to convert
- `in_low` / `in_high` (`number`) Input interval
- `out_low` / `out_high` (`number`) Output interval
- `clamped` (`boolean` default `false`) If `true`, constrains the input position to 0–1 before conversion

RET
- `number` -- Converted value

ERRORS

- `in_low == in_high` : Cannot be specified because the input interval would have zero width

```lua
-- Move the Y offset from 0.7 to 0.5 between 0.5 and 1.2 seconds
character.offset_y = mt.remap(ctx.time, 0.5, 1.2, 0.7, 0.5, true)
```

#### `mt.wrap(value, boundaryA, boundaryB)`

Wraps a value within the half-open interval
`[min(boundaryA, boundaryB), max(boundaryA, boundaryB))`.
The boundaries may be specified in either order. Use it to make angles or hues periodic.

ARGS
- `value` (`number`) Value to wrap
- `boundaryA` (`number`) One boundary that defines the interval
- `boundaryB` (`number`) The other boundary that defines the interval

RET
- `number` -- Wrapped value

ERRORS

If both boundaries are equal, the function returns that boundary value.

### 2. Interpolation and Keyframes

#### `mt.lerp(from, to, t)`

Linearly interpolates from `from` to `to`.

ARGS
- `from` (`number`) Value when `t = 0`
- `to` (`number`) Value when `t = 1`
- `t` (`number`) Interpolation factor. It is not clamped, so values outside 0–1 produce extrapolation

RET
- `number` Same as the input values -- `from + (to - from) * t`

#### `mt.inverse_lerp(from, to, value)`

The inverse of `mt.lerp`. Returns the position of `value` within the interval `[from, to]` as an interpolation factor.

ARGS
- `from` (`number`) Start of the interval corresponding to a factor of 0
- `to` (`number`) End of the interval corresponding to a factor of 1
- `value` (`number`) Value whose position to calculate

RET
- `number` -- `(value - from) / (to - from)`. Not clamped

ERRORS

Returns `0` if `from == to`.

#### `mt.lerp_angle(from, to, t)`

Interpolates angles in degrees along the **shortest direction**. Use it to avoid taking the long way around, as with `mt.lerp(350, 10, t)` (interpolates 350°→10° along the +20° direction).

ARGS
- `from` (`number` degree) Starting angle
- `to` (`number` degree) Target angle
- `t` (`number`) Interpolation factor. Not clamped

RET
- `number` degree -- Interpolated angle

#### `mt.smoothstep(edge0, edge1, value)`

Returns a value that transitions smoothly from 0 to 1 as `value` crosses from `edge0` to `edge1` (Hermite interpolation, with zero velocity at both ends).

ARGS
- `edge0` (`number`) Start of the transition, where the result is 0
- `edge1` (`number`) End of the transition, where the result is 1
- `value` (`number`) Value to evaluate

RET
- `number` 0–1 -- Smooth transition value. Clamped outside the interval

ERRORS

- `edge0 == edge1` : Cannot be specified because the transition interval would have zero width

#### `mt.keyframes(keys, time)`

Evaluates keyframes spanning multiple intervals. Because it can be called directly with `ctx.time`, you can write multistage choreography such as falling → bouncing → stopping without manually combining `clamp` and `inverse_lerp`.

ARGS
- `keys` (`table[]`) Array of keyframes. Each element has the form `{ t = <time>, v = <value>, ease = <optional> }`, ordered by ascending `t`
- `time` (`number` seconds) Time to evaluate

Each key’s `v` must be either a number or a color table of the form `{ r, g, b, a }`; the two types cannot be mixed within one `keys` array. `ease` is optional (linear by default) and is applied to the interval **leading up to that key**. You can pass a string naming an easing function, such as `mt.ease.out_bounce`, or any easing function in the form `function(t) ... end`.

If `time` is before the first key, the first value is returned; if it is after the last key, the last value is returned (clamping).

RET
- `number | color` Same as the key values -- Value interpolated within the interval

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

### 3. Progress Distribution

#### `mt.distribute(index, count)`

Distributes a 1-based index evenly across 0–1. The first index maps to `0`, and the last maps to `1`.

ARGS
- `index` (`integer`) 1-based index, such as an index for `ctx.chars[index]`
- `count` (`integer`) Total count, such as `ctx.char_count`

RET
- `number` 0–1 -- `(index - 1) / (count - 1)` constrained to 0–1. Returns `0` if `count <= 1`

```lua
-- Arrange hues in a rainbow according to character position
local hue = mt.distribute(index, ctx.char_count)
character.fill.use = true
character.fill.color = mt.color.from_okhsv(hue, 0.8, 1.0)
```

#### `mt.order_text(entries)`

Converts encoded character or global-part indices into validated `ctx.output.manual_order_text`. Input order and duplicates are preserved.

Use a plain 1-based index or `mt.CHAR | index` for a character, and `mt.PART | index` for a global part. Each index must be an integer from 1 through 1024. `mt.NOT` is rejected because manual order has no exclusion syntax.

ARGS
- `entries` (`integer[]`) Encoded character and global-part indices in output order

RET
- `string` -- Valid manual-order text representing the input sequence; an empty array returns an empty string

```lua
local order = {}
for index = ctx.char_count, 1, -1 do
    order[#order + 1] = mt.CHAR | index
end
ctx.output.manual_order_enabled = true
ctx.output.manual_order_text = mt.order_text(order)
```

#### `mt.CHAR`

Value: `0x0000`. Character-kind flag; combine it with a 1-based character index. Because the value is zero, a plain index is equivalent.

#### `mt.PART`

Value: `0x10000`. Global-part-kind flag; combine it with a 1-based global part index. The low 16 bits are reserved for the index.

#### `mt.NOT`

Value: `0x20000`. Exclusion flag reserved for target syntax. Do not pass it to `mt.order_text`.

#### `mt.each_char(ctx, options?)`

Returns an iterator over shaped characters with optional filtering. `index` always addresses `ctx.chars`, so it can be passed straight to `ctx.chars[index]` or to the `mt.layout.*` helpers. The counter within the filtered subset is `info.n`.

ARGS
- `ctx` (`table`) OnLayout / OnPath context
- `options.from` (`integer` default `1`) First character index to visit
- `options.to` (`integer` default `ctx.char_count`) Last character index to visit, inclusive
- `options.line` (`integer` default No filter) Keep only characters with this `line_index`
- `options.order` (`string` default `"asc"`) How `info.progress` is assigned: `"asc"` / `"desc"` / `"center"` / `"random"`
- `options.seed` (`integer` default `0`) Seed selecting the order when `order = "random"`

RET

- `function` : Iterator yielding `index` (into `ctx.chars`), `character` and `info`

Fields of `info`:

- `progress` : `number` : Normalized position in 0–1 following `order`
- `n` : `integer` : 1-based counter within the filtered subset
- `count` : `integer` : Number of elements in the filtered subset (at least `1`)
- `first` / `last` : `boolean` : Whether this is the first or last element of the filtered subset

`order` only remaps `progress`; the visit order is always ascending by index.

- `"asc"` : `0, 0.25, 0.5, 0.75, 1`
- `"desc"` : `1, 0.75, 0.5, 0.25, 0`
- `"center"` : `1, 0.5, 0, 0.5, 1`
- `"random"` : A duplicate-free shuffle determined by the seed

`"center"` is the normalized distance from the midpoint. With an even count no element sits on the midpoint, so the minimum is not `0`.

> **Note**: `info` is the same table on every iteration. Copy the values out if they need to outlive the loop.

```lua
-- Open the second line from the centre outwards
for index, character, info in mt.each_char(ctx, { line = 1, order = "center" }) do
    local delay = info.progress * 0.4
    character.opacity = mt.saturate((ctx.time - delay) * 4.0)
end
```

#### `mt.each_part(ctx, options?)`

Returns an iterator over shaped parts with optional filtering. It follows the same rules as `mt.each_char`, and additionally resolves the owning character on `info` and can filter by it.

ARGS
- `ctx` (`table`) OnLayout / OnPath context
- `options.from` (`integer` default `1`) First part index to visit
- `options.to` (`integer` default `ctx.part_count`) Last part index to visit, inclusive
- `options.from_char` (`integer` default No filter) Keep only parts whose owning character index is at or above this
- `options.to_char` (`integer` default No filter) Keep only parts whose owning character index is at or below this
- `options.line` (`integer` default No filter) Keep only parts with this `line_index`
- `options.order` (`string` default `"asc"`) How `info.progress` is assigned, as in `mt.each_char`
- `options.seed` (`integer` default `0`) Seed selecting the order when `order = "random"`

`from` / `to` (a range of part indices) and `from_char` / `to_char` (a range of owning character indices) are separate axes. When both are given, only parts satisfying both pass.

RET

- `function` : Iterator yielding `index` (into `ctx.parts`), `part` and `info`

`info` carries every field from `mt.each_char` plus:

- `char` : `MtCharacter` : The character owning this part (an element of `ctx.chars`)
- `char_index` : `integer` : Index of the owning character in `ctx.chars`
- `index_in_char` : `integer` : Position within the owning character

`info.progress` spans the **whole filtered set** across 0–1. It does not restart on character boundaries. To span 0–1 per character, nest `mt.each_char` and `mt.each_part`.

```lua
-- Lift the parts of characters 3 through 5 in one continuous run
for index, part, info in mt.each_part(ctx, { from_char = 3, to_char = 5 }) do
    part.offset_y = info.progress * 0.05
    part.rotation = info.char.rotation * 0.5
end
```

#### `mt.stagger(time, index, delay, duration)`

Returns animation progress with a different start time for each index (domino cascade, typewriter, sequential entrance). This is the standard function for character-by-character animation. The animation for index `i` begins `delay * (i - 1)` seconds later and progresses from 0 to 1 over `duration` seconds.

ARGS
- `time` (`number` seconds) Elapsed time since the animation began
- `index` (`integer`) 1-based index
- `delay` (`number` seconds) Delay before the next index begins
- `duration` (`number` seconds) Animation duration for each index

RET
- `number` 0–1 -- Progress clamped to 0–1

ERRORS

- `duration <= 0` : Specify a value greater than 0

```lua
for index = 1, ctx.char_count do
    local progress = mt.stagger(ctx.time, index, 0.08, 0.4)
    ctx.chars[index].offset_y = 0.5 + (1.0 - mt.ease.out_cubic(progress)) * 0.2
end
```

#### `mt.stagger_progress(progress, position, span)`

Adds a position-dependent start delay to an existing 0–1 normalized progress for synchronized group cascade within a shared window.
The element at `position = 0` starts with the shared progress, while the element
at `position = 1` starts when the shared progress reaches `span`. Every element
finishes when the shared progress reaches 1.

Use `mt.stagger` when constructing progress from time in seconds, an index, and
an individual animation duration. Use `mt.stagger_progress` when distributing
progress already obtained from a helper such as
`mt.timeline.intro_outro_seconds`.

ARGS
- `progress` (`number` 0–1) Shared progress to distribute. Values outside the range are accepted, and the result is clamped to 0–1
- `position` (`number` 0–1) Normalized element position. Values outside the range are clamped to 0–1. Usually `info.progress`
- `span` (`number` less than 1) Fraction of the shared window across which start times are distributed

RET
- `number` 0–1 -- Progress for the element at `position`

The result is calculated as follows:

```lua
mt.saturate((progress - mt.saturate(position) * span) / (1.0 - span))
```

ERRORS

- `progress` or `position` is not finite : Error
- `span` is not finite : Error
- `span < 0` or `span >= 1` : Error

```lua
local introProgress, outroProgress =
    mt.timeline.intro_outro_seconds(ctx, 0.5, 0.5, 5.0)

for _, character, info in mt.each_char(ctx, { order = "center" }) do
    local appear = mt.ease.out_back(
        mt.stagger_progress(introProgress, info.progress, 0.35))
    local disappear = mt.ease.in_cubic(
        mt.stagger_progress(outroProgress, info.progress, 0.25))

    character.scale = appear
    character.opacity = appear * (1.0 - disappear)
end
```

Changing the `order` of `mt.each_char` or `mt.each_part` changes only the start
time assignment, not the loop's visit order.

#### `mt.stagger_pattern(time, index, count, pattern, delay, duration, seed?)`

Returns staggered progress with a configurable starting direction or order (ascending, descending, center-out ripple, duplicate-free random).

ARGS
- `time` (`number` seconds) Time to evaluate
- `index` (`integer`) 1-based index
- `count` (`integer`) Total count, such as `ctx.char_count`
- `pattern` (`string`) Progression pattern: `"asc"` / `"desc"` (alias `"right_to_left"`) / `"center"` / `"random"`
- `delay` (`number` seconds) Start delay
- `duration` (`number` seconds) Animation duration
- `seed` (`integer` default `42`) Random seed when `pattern = "random"`

`"random"` assigns a duplicate-free shuffled rank to each index. Ranks are always exactly one apart, so the delays stay evenly spaced.

RET
- `number` 0–1 -- Progress clamped to 0–1

ERRORS

- `duration <= 0` : Specify a value greater than 0

### 4. Distance-Based Influence

#### `mt.falloff(distance, radius)`

Returns an influence weight that is strongest at the center and decreases smoothly with distance (wavefront, passing shine, ripple, shockwave, localized emphasis). The return value is 0–1.

ARGS
- `distance` (`number` Input coordinate system) Distance from the center of the effect
- `radius` (`number` Input coordinate system) Spread of the falloff. At this distance, the weight is approximately `0.37` (`e^-1`)

This is a standard choice for **concentrating an effect around a particular position**, such as a wave crest, a moving highlight, or emphasis focused on one location.

Choosing between it and `mt.smoothstep`: `smoothstep` becomes exactly 0 outside its range, creating a cutoff, whereas `falloff` has a tail that continues indefinitely. As a result, a moving crest or light appears to **pass through continuously**. It also avoids the corner produced by linear falloff such as (`1 - d/r`).

RET
- `number` 0–1 -- Distance-based influence weight

```lua
-- Raise only the characters currently being passed by the waveFront
local distance = characterRadius - waveFront
character.offset_y = 0.5 + mt.falloff(distance, 0.25) * 0.1
```

> [!NOTE]
> Passing `0` for `radius` returns `0` to avoid division by zero.

### 5. Deterministic Random Values and Noise

#### `mt.random(seed, index, channel?)`

A stable random value determined solely by the `(seed, index, channel)` tuple. Because it does not depend on call order, it can safely be used to vary individual characters or parts (`math.random` depends on call order and cannot be used safely for this purpose).

> [!TIP]
> Name each use with `channel`, such as `"angle"` or `"distance"`, to obtain independent
> random values without manually salting the seed or index.

ARGS
- `seed` (`integer`) Value selecting the random sequence. Use the same seed for the same purpose
- `index` (`integer`) Position within the sequence, such as a character index
- `channel` (`string` optional) Name separating one use from another.

RET
- `number` 0–1 -- Random value in `[0, 1)`. The same arguments always produce the same value

ERRORS

The UTF-8 bytes of `channel` are converted with a fixed 32-bit hash. Unicode normalization
is not performed, so ASCII names such as `"angle"` or `"color.hue"` are recommended.
The 32-bit hash can theoretically collide and is not suitable for cryptographic use.

#### `mt.random_range(seed, index, low, high, channel?)`

Returns the result of `mt.random` mapped to `[low, high)`. An optional string `channel` separates random sequences by purpose.

ARGS
- `seed` / `index` (`integer`) Same as `mt.random`
- `low` / `high` (`number`) Output range
- `channel` (`string` optional) Same as `mt.random`.

RET
- `number` Same as the output range -- Stable random value in `[low, high)`

#### `mt.distributed_random(seed, index, count, low, high, channel?)`

Assigns `count` evenly spaced values in `[low, high)` to 1-based indices through a deterministic permutation. Unlike independent calls to `mt.random_range`, the complete set has no clusters or duplicate values. Use `info.n` and `info.count` with `mt.each_char` or `mt.each_part` so filtered indices remain contiguous.

ARGS
- `seed` (`integer`) Value selecting the permutation and common offset
- `index` (`integer`) Assignment position from 1 through `count`
- `count` (`integer`) Number of values; must be at least 1
- `low` / `high` (`number`) Finite output bounds with `low < high`
- `channel` (`string` optional) Name separating independent assignments

RET
- `number` Same as the output range -- Stable assigned value in `[low, high)`; adjacent sorted values differ by `(high - low) / count`

```lua
for _, character, info in mt.each_char(ctx) do
    local phase = mt.distributed_random(
        ctx.meta.instance_seed, info.n, info.count, 0.0, math.pi * 2.0, "phase")
    character.offset_y = 0.5 + mt.wave(ctx.time, 0.5, phase) * 0.03
end
```

#### `mt.noise1(x, seed?)`

Deterministic one-dimensional value noise. Returns a fluctuation that varies smoothly and continuously with `x`. Passing time as `x` produces temporal fluctuation; passing a position produces spatial fluctuation.

ARGS
- `x` (`number`) Sample position. Values are smoothly interpolated between lattice points at integer intervals
- `seed` (`integer` default `0`) Value that changes the fluctuation pattern

RET
- `number` -1–1 -- Continuous value that is always the same for the same arguments

```lua
-- Handheld-camera-style shake with a different phase for each character
character.rotation = mt.noise1(ctx.time * 0.8, index) * 4.0
```

#### `mt.noise2(x, y, seed?)`

Deterministic two-dimensional value noise. Returns smooth fluctuation at position `(x, y)`. Passing time on one axis and character position on the other can create fluctuation that “flows through space.”

ARGS
- `x` / `y` (`number`) Sample position
- `seed` (`integer` default `0`) Value that changes the fluctuation pattern

RET
- `number` -1–1 -- Continuous value that is always the same for the same arguments

#### `mt.wiggle(time, frequency, amplitude, octaves?, seed?)`

Computes deterministic organic tremor (camera shake, wandering float, handheld jitter).

ARGS
- `time` (`number` seconds) Time to evaluate
- `frequency` (`number` Hz) Number of fluctuations per second
- `amplitude` (`number` Same as the output value) Amplitude of the first octave. This is not the maximum sum across multiple octaves
- `octaves` (`integer` default `1`) Number of noise octaves to layer
- `seed` (`integer` default `0`) Random seed

RET
- `number` Same as `amplitude` -- Fluctuation value

When `octaves > 1`, the amplitudes are halved as they are added, so the theoretical absolute upper bound is `amplitude * (2 - 2^(1 - octaves))`, approaching `2 * amplitude` as the number of octaves increases.

### 6. Cycles and Springs

#### `mt.cycle(t, period)`

Repeating 0 to 1 linear sawtooth ramp (looping animation, continuous timer, beacon sweep).

ARGS
- `t` (`number` seconds) Time to evaluate
- `period` (`number` seconds) Length of one cycle

RET
- `number` 0–1 -- Progress greater than or equal to 0 and less than 1

ERRORS

- `period <= 0` : Specify a value greater than 0

#### `mt.pingpong(t, period)`

Repeating 0 to 1 to 0 back-and-forth motion (pendulum, shuttle loop).

ARGS
- `t` (`number` seconds) Time to evaluate
- `period` (`number` seconds) Length of one round trip

RET
- `number` 0–1 -- Oscillating value from 0 to 1

ERRORS

- `period <= 0` : Specify a value greater than 0

#### `mt.wave(t, frequency, phase?)`

Computes a sine wave harmonic oscillation (floating, bobbing, undulating, breathing). Shorthand for `sin(2π × frequency × t + phase)`.

ARGS
- `t` (`number` seconds) Time to evaluate
- `frequency` (`number` Hz) Number of cycles per second
- `phase` (`number` radian default `0`) Phase offset. It can also offset the wave for each index

RET
- `number` -1–1 -- Waveform value

#### `mt.wave_square(t, frequency, phase?)`

Computes a square wave periodic toggle between -1 and 1 (blink, strobe, flashing).

ARGS
- `t` (`number` seconds) Time to evaluate
- `frequency` (`number` Hz) Number of cycles per second
- `phase` (`number` radian default `0`) Phase offset

RET
- `number` -- `-1.0` or `1.0`

#### `mt.wave_triangle(t, frequency, phase?)`

A triangle wave.

ARGS
- `t` (`number` seconds) Time to evaluate
- `frequency` (`number` Hz) Number of cycles per second
- `phase` (`number` radian default `0`) Phase offset

RET
- `number` -1–1 -- Value that travels linearly back and forth between `-1.0` and `1.0`

#### `mt.wave_sawtooth(t, frequency, phase?)`

A sawtooth wave.

ARGS
- `t` (`number` seconds) Time to evaluate
- `frequency` (`number` Hz) Number of cycles per second
- `phase` (`number` radian default `0`) Phase offset

RET
- `number` -1–1 -- Repeating value that rises linearly from `-1.0` to less than `1.0`

#### `mt.spring(t, frequency, damping)`

Computes a damped harmonic oscillation (elastic recoil, jiggle, wobble, overshoot settling). It begins at `1` when `t = 0` and converges toward `0` while oscillating.

ARGS
- `t` (`number` seconds) Elapsed time since the motion began. Returns the initial value when `t <= 0`
- `frequency` (`number` Hz) Number of oscillations per second
- `damping` (`number` 1/second) Damping strength. Larger values converge faster

RET
- `number` -- Damped oscillation value converging from the initial value 1 toward 0

For `t > 0`, it calculates `exp(-damping * t) * cos(2π * frequency * t)`.

> [!WARNING]
> **The return value is not confined to 0–1.** During damping, it can take **negative values** (and, depending on the phase, overshoot within a range that does not slightly exceed 1). This is the overshoot effect itself, analogous to `mt.ease.out_back` / `elastic` extending outside 0–1.
>
> - **Suitable uses**: A **residual displacement** such as `offset`, `rotation`, or scatter amount (for example, `0.5 + settle * 0.1`)
> - **Unsuitable uses**: Direct assignment to progress, `opacity`, `scale`, or `stretch`, or use as the `t` argument to `mt.lerp`. If you need progress, use `mt.ease.*` or `mt.saturate`, and do not multiply a scale factor directly by a negative value (`stretch` has no host-side lower-bound clamp and can reach rendering while still negative. `scale` is clamped to a positive lower bound, and `opacity` is clamped to 0–1 immediately before rendering)

```lua
-- Use as deviation from the target position (maximum at t=0 and converges over time; negative intervals are overshoot)
local settle = mt.spring(ctx.time - start_time, 3.0, 4.0)
character.offset_y = 0.5 + settle * 0.1
```

### 7. Displacement from Polar Coordinates

#### `mt.polar_offset_2d(angleDegrees, radius)`

Converts a polar direction (degrees) and radius into a Y-up canvas offset pair (radial scatter, orbital motion, circular explosion). It lets you express motion such as scattering, gathering, and orbiting without writing `cos` / `sin`.

ARGS
- `angleDegrees` (`number` degree) Direction. As with coordinates, 0 degrees points right and positive values rotate clockwise
- `radius` (`number` canvas normalized displacement) Distance in that direction

RET
- `number, number` canvas normalized displacement -- Two values: `offsetX, offsetY`

The input angle uses the same screen-based convention as `rotation` / `shadow.angle` (90 degrees points down), but the returned values are Y-up. They can be added directly to `offset_x` / `offset_y`. `mt.projectile_2d` uses the same convention.

```lua
-- Scatter characters radially
local angle = mt.distribute(index, ctx.char_count) * 360.0
local dx, dy = mt.polar_offset_2d(angle, 0.3 * scatterAmount)
character.offset_x = 0.5 + dx
character.offset_y = 0.5 + dy
```

### 8. Physical Motion

#### `mt.bounce_y(config)` / `mt.bounce_x(config)`

Calculates and returns the position, velocity, Squash & Stretch, and contact-position correction for a one-dimensional ballistic bounce against a floor (Y axis) or wall (X axis). It does not modify characters or parts directly. Both a configuration-table form and a positional-argument form are supported.

ARGS
- `config` (`table`) Settings for time, collision surface, starting position, gravity or acceleration, restitution, initial velocity, and Squash & Stretch

##### Shared `config`

- `t` : `number` : seconds : `0.0` : Elapsed time since the animation began
- `restitution` : `number` : `0.5` : Coefficient of restitution. Larger values produce a stronger rebound after impact
- `start_velocity` : `number` : canvas normalized displacement/second : `0.0` : Initial velocity along the axis
- `squash` / `squash_strength` : `number` : factor : `0.15` : Strength with which the contact axis is compressed according to impact velocity
- `stretch` / `stretch_strength` : `number` : factor : `0.02` : Strength with which the direction-of-motion axis is extended according to movement velocity
- `flexibility` : `number` : radian/second : `16.0` : Oscillation speed when returning to the original shape after impact
- `damping` : `number` : 1/second : `7.0` : Rate at which post-impact oscillation settles

When an item has multiple names, the leftmost name takes precedence. Names to the right are compatibility aliases.

##### `config` Specific to `mt.bounce_y`

- `ground_y` : `number` : canvas normalized position : `0.0` : Y coordinate of the floor to collide with
- `start_y` : `number` : canvas normalized position : `0.0` : Starting Y coordinate
- `gravity` : `number` : canvas normalized displacement/second² : `9.81` : Magnitude of acceleration toward the floor

##### `config` Specific to `mt.bounce_x`

- `wall_x` / `ground_x` : `number` : canvas normalized position : `0.0` : X coordinate of the wall to collide with. `ground_x` is a compatibility alias
- `start_x` : `number` : canvas normalized position : `0.0` : Starting X coordinate
- `acceleration` / `accel_x` / `gravity` : `number` : canvas normalized displacement/second² : `9.81` : Magnitude of acceleration toward the wall. `accel_x` and `gravity` are compatibility aliases

##### Positional-Argument Form

Instead of a configuration table, you can pass each value in the following order.

```lua
mt.bounce_y(t, groundY, startY, gravity, restitution, startVelocity,
    squashStrength, stretchStrength, flexibility, damping)

mt.bounce_x(t, wallX, startX, acceleration, restitution, startVelocity,
    squashStrength, stretchStrength, flexibility, damping)
```

Each argument can be omitted and uses the same default as the corresponding `config` field.

RET (one of)
- `table` -- In configuration-table form, a table containing position, velocity, deformation, and collision state
- Multiple `number` values As appropriate for each value -- In positional-argument form, returns the calculation result as eight values

##### Return-Value Table

- `pos` : `number` : canvas normalized position : Calculated coordinate along the axis
- `y` : `number` : canvas normalized position : Calculated Y coordinate for `mt.bounce_y`. Same value as `pos`
- `x` : `number` : canvas normalized position : Calculated X coordinate for `mt.bounce_x`. Same value as `pos`
- `velocity` : `number` : canvas normalized displacement/second : Velocity along the axis at that time
- `stretch_x` / `stretch_y` : `number` : multiplier : X- and Y-axis stretch factors incorporating Squash & Stretch
- `offset_y` : `number` : Ratio of `bounds_height` : Correction used by `mt.bounce_y` to preserve the contact position
- `offset_x` : `number` : Ratio of `bounds_width` : Correction used by `mt.bounce_x` to preserve the contact position
- `last_impact_time` : `number` / `nil` : seconds : Time of the previous impact. `nil` if no impact has occurred yet
- `next_impact_time` : `number` / `nil` : seconds : Time of the next impact. `nil` if the object has already settled
- `impact_count` : `integer` : impacts : Number of impacts so far
- `settled` : `boolean` : Whether the bounce has ended and the object has settled

The table’s `[1]` through `[5]` entries also provide, in order, the axis coordinate, `stretch_x`, `stretch_y`, contact-position correction, and `velocity`.

In positional-argument form, the function returns the axis coordinate, `stretch_x`, `stretch_y`, contact-position correction, `velocity`, `last_impact_time`, `next_impact_time`, and `impact_count`, in that order. `settled` is available only in configuration-table form.

##### Notes

- Normally, specify a `restitution` value greater than or equal to `0` and less than `1`.
- The sign of `gravity` or `acceleration` is ignored; its absolute value is treated as the acceleration magnitude.

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

#### `mt.bounce_ground(ctx, item, groundY, config?)`

A simple convenience function that drops a character or part `item` toward the specified ground Canvas coordinate `groundY` (for example, `0.1`), then makes it bounce and land with a springy motion. `offset_y`, `stretch_x`, and `stretch_y` are applied automatically.

ARGS
- `ctx` (`table`) `OnLayout` context
- `item` (`table`) Character or part to modify
- `groundY` (`number` canvas normalized coordinate) Y coordinate at which to land
- `config` (`table` default `nil`) Settings such as starting position, contact reference, and physical parameters

RET
- `table` -- Calculated bounce state

##### Changes

- `item.offset_y` : `number` : canvas normalized displacement : Sets the calculated Y displacement
- `item.offset_x` : `number` : canvas normalized displacement : When `ground_mode = "absolute"`, sets the displacement that preserves the current X position on the canvas
- `item.stretch_x` / `item.stretch_y` : `number` : multiplier : Sets the Squash & Stretch from the bounce state

##### `config`

- `t` : `number` : seconds : `ctx.time` : Time to evaluate
- `delay` : `number` : seconds : `0.0` : Waiting time before motion begins
- `start_mode` : `string` : `"absolute"` when `start_y` is specified; otherwise `"relative"` : Reference for the starting position. `"relative"` starts `drop_height` above the current position; `"absolute"` uses `start_y`
- `start_y` : `number` : canvas normalized position : `nil` : Starting position used when `start_mode = "absolute"`
- `drop_height` : `number` : canvas normalized displacement : `0.3` : Distance above the current position when `start_mode = "relative"`
- `ground_mode` : `string` : Same as `start_mode` : Reference for the landing position. `"absolute"` treats `groundY` as a fixed position on the canvas; `"relative"` follows transforms higher in the hierarchy
- `align_to` : `string` : `"bottom"` : Position to place on the ground. `"bottom"` / `"bounds_bottom"` means the bottom edge of the ink bounds, `"baseline"` means the character's horizontal baseline, and `"center"` means the center of the ink bounds. For a part, which has no baseline, `"baseline"` falls back to the bottom edge
- `gravity` : `number` : canvas normalized displacement/second² : `4.0` : Magnitude of acceleration toward the ground
- `restitution` : `number` : `0.45` : Coefficient of restitution
- `start_velocity` : `number` : canvas normalized displacement/second : `0.0` : Initial velocity along the Y axis
- `squash` : `number` : factor : `0.15` : Strength with which the contact axis is compressed according to impact velocity
- `stretch` : `number` : factor : `0.02` : Strength with which the direction-of-motion axis is extended according to movement velocity
- `flexibility` : `number` : radian/second : `16.0` : Oscillation speed when returning to the original shape after impact
- `damping` : `number` : 1/second : `7.0` : Rate at which post-impact oscillation settles

When `ground_mode = "absolute"`, the landing position is calculated using the canvas-space bounding rectangle after rotation and scale have been applied.

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

#### `mt.bounce_wall(ctx, item, wallX, config?)`

A simple convenience function that makes a character or part `item` collide with and bounce off the specified wall Canvas coordinate `wallX` (for example, `0.9`). `offset_x`, `stretch_x`, and `stretch_y` are applied automatically.

ARGS
- `ctx` (`table`) `OnLayout` context
- `item` (`table`) Character or part to modify
- `wallX` (`number` canvas normalized coordinate) X coordinate of the collision target
- `config` (`table` default `nil`) Settings such as starting position, collision reference, and physical parameters

RET
- `table` -- Calculated bounce state

##### Changes

- `item.offset_x` : `number` : canvas normalized displacement : Sets the calculated X displacement
- `item.offset_y` : `number` : canvas normalized displacement : When `config.wall_mode = "absolute"`, sets the displacement that preserves the current Y position on the canvas
- `item.stretch_x` / `item.stretch_y` : `number` : multiplier : Sets the Squash & Stretch at impact

##### `config`

- `t` : `number` : seconds : `ctx.time` : Time to evaluate
- `delay` : `number` : seconds : `0.0` : Waiting time before motion begins
- `start_mode` : `string` : `"absolute"` when `start_x` is specified; otherwise `"relative"` : Reference for the starting position. `"relative"` starts `travel_distance` away from the current position in the direction opposite the wall; `"absolute"` uses `start_x`
- `start_x` : `number` : canvas normalized position : `nil` : Starting position used when `start_mode = "absolute"`
- `travel_distance` : `number` : canvas normalized displacement : `0.3` : Distance from the current position in the direction opposite the wall when `start_mode = "relative"`
- `wall_mode` : `string` : Same as `start_mode` : Reference for the collision position. `"absolute"` treats `wallX` as a fixed position on the canvas; `"relative"` follows transforms higher in the hierarchy
- `align_to` : `string` : Determined from the direction of travel : Position to make contact. Defaults to `"right"` when approaching from the left and `"left"` when approaching from the right. `"bounds_right"`, `"bounds_left"`, and `"center"` can also be specified
- `accel` / `acceleration` : `number` : canvas normalized displacement/second² : `4.0` : Magnitude of acceleration toward the wall. `accel` takes precedence
- `restitution` : `number` : `0.45` : Coefficient of restitution
- `start_velocity` : `number` : canvas normalized displacement/second : `0.0` : Initial velocity along the X axis
- `squash` : `number` : factor : `0.15` : Strength with which the contact axis is compressed according to impact velocity
- `stretch` : `number` : factor : `0.02` : Strength with which the direction-of-motion axis is extended according to movement velocity
- `flexibility` : `number` : radian/second : `16.0` : Oscillation speed when returning to the original shape after impact
- `damping` : `number` : 1/second : `7.0` : Rate at which post-impact oscillation settles

```lua
-- Launch every part from a common fixed screen position (0.1) and bounce it off the wall (wallX = 0.9)
mt.bounce_wall(ctx, ctx.parts[i], 0.9, { start_mode = "absolute", start_x = 0.1, delay = i * 0.05 })

-- Launch from a position a fixed distance (0.25) behind each part
mt.bounce_wall(ctx, ctx.parts[i], 0.9, { start_mode = "relative", travel_distance = 0.25 })
```

#### `mt.impact_squash(config)`

Calculates a **Squash & Stretch impulse that compresses and rebounds at the instant of impact**. It uses the damped oscillation `sin(ωt) * exp(-γt)`, compressing most strongly immediately after impact and returning to the original shape while oscillating.

Because `mt.bounce_*` already applies Squash & Stretch internally, use this function when you want to represent an impact **at timing you control yourself**, such as colliding with another character or hitting something other than the ground.

ARGS
- `config` (`table`) Settings for impact time and deformation characteristics

##### `config`

- `t` : `number` : seconds : `0.0` : Current time. Before `impact_time`, returns values with no deformation
- `impact_time` : `number` : seconds : `0.0` : Time of impact. You can pass `last_impact_time` from `mt.bounce_*`
- `squash` : `number` : ratio : `0.15` : Maximum compression amount. With `0.2`, the height is 80% at maximum compression
- `stiffness` : `number` : radian/second : `25.0` : Speed of return to the original shape
- `damping` : `number` : 1/second : `12.0` : Rate at which oscillation settles

RET (multiple values)
1. `number` multiplier -- `stretchX`. X-axis stretch factor
2. `number` multiplier -- `stretchY`. Y-axis stretch factor. It is the reciprocal of `stretchX` to preserve volume
3. `number` Ratio of `bounds_height` -- `offsetCorrection`. Corrects the contact-position shift caused by compression. Multiply it by `bounds_height` and add it to `offset_y`

The name and meaning of `squash` are shared with the `squash` setting of `mt.bounce_*`.

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

#### `mt.projectile_2d(config)` / `mt.projectile_2d(t, speed, angle, gravity?, spin?, drag?)`

Closed-form 2D ballistic flight from launch velocity under gravity (cannon launch, falling debris, ballistic trajectory). While `mt.bounce_y` / `mt.bounce_x` model motion that strikes a surface and bounces, this function is for motion that is thrown and does not land (scattered debris, explosions, and tosses).

ARGS
- `config` (`table`) Settings such as elapsed time since launch, initial velocity, direction, and gravity

##### `config`

- `t` : `number` : seconds : `0.0` : Elapsed time since launch. Negative values are treated as `0`
- `speed` : `number` : canvas normalized displacement/second : `0.0` : Initial speed
- `angle` : `number` : degrees : `0.0` : Launch direction. `0` points right, and the positive direction is clockwise. `-90` points straight up
- `gravity` : `number` : canvas normalized displacement/second² : `4.0` : Downward acceleration
- `spin` : `number` : degrees/second : `0.0` : Angular velocity. The returned `rotation` can be assigned directly to the field of the same name
- `drag` : `number` : 1/second : `0.0` : Exponential decay rate for air resistance. `0` means no decay
- `start_x` / `start_y` : `number` : canvas normalized position : `0.0` : Launch position. If omitted, returns displacement relative to the origin

##### Positional-Argument Form

- `t` : `number` : seconds : `0.0` : Elapsed time since launch. Negative values are treated as `0`
- `speed` : `number` : canvas normalized displacement/second : `0.0` : Initial speed
- `angle` : `number` : degrees : `0.0` : Launch direction
- `gravity` : `number` : canvas normalized displacement/second² : `4.0` : Downward acceleration
- `spin` : `number` : degrees/second : `0.0` : Angular velocity
- `drag` : `number` : 1/second : `0.0` : Exponential decay rate for air resistance

Because the launch position cannot be specified in positional-argument form, this form returns displacement relative to the origin.

RET (one of)
- `table` -- In table form, returns a result containing `x`, `y`, `rotation`, `velocity_x`, and `velocity_y`. The same values are also available as `[1]` through `[5]`
- Multiple `number` values As appropriate for each value -- In positional-argument form, returns `x`, `y`, `rotation`, `velocity_x`, and `velocity_y`, in that order

> [!IMPORTANT]
> **The angle is screen-based (clockwise), but the returned `y` uses Canvas coordinates (positive upward).**
> With `angle = -90` (launched straight up), `y` increases and then begins decreasing under gravity. It can be added directly to `offset_y`.

```lua
-- Scatter fragments in a fan and make them fall while rotating
local angle = mt.random_range(seed, index, -140.0, -40.0, "angle")
local speed = mt.random_range(seed, index, 0.6, 1.2, "speed")
local flight = mt.projectile_2d({
    t = ctx.time - burstTime,
    speed = speed,
    angle = angle,
    gravity = 3.0,
    spin = mt.random_range(seed, index, -360.0, 360.0, "spin"),
})
part.offset_x = 0.5 + flight.x
part.offset_y = 0.5 + flight.y
part.rotation = flight.rotation
```

##### Keeping the arc readable

The returned `x` / `y` are always a true parabola. When a flight *looks* wrong,
the trajectory is rarely the cause — something layered on top of it is:

- **Do not touch `pivot_*`.** Leave it at `0.5`. Adding the flight displacement
  to the pivot as well makes the fragment orbit a distant point instead of
  following its arc. See "Pivot reference points".
- **Keep the tumble bounded.** `spin` does not bend the path, but a fragment
  turning several times per second reads as rolling in place and hides the arc.
  For 3D `yaw` / `pitch`, prefer a *total* angle that eases to a settled attitude
  over a rate multiplied by elapsed time, which accumulates without limit.
- **A purely radial throw barely arcs.** On a single line of text the outward
  direction is nearly horizontal, so there is little rise to fall back from.
  Blend the direction toward straight up (`-90`) to give the debris real lift.

#### `mt.friction_decay(t, speed, friction)`

Calculates exponential friction deceleration from initial velocity (sliding stop, braking inertia). It lets you control motion that “rushes in and glides to a stop” using the physical quantities initial velocity and coefficient of friction, rather than arrival time.

ARGS
- `t` (`number` seconds) Elapsed time. Negative values are treated as `0`
- `speed` (`number` canvas normalized displacement/second) Initial speed
- `friction` (`number` 1/second default `0.0`) Decay rate. Larger values stop sooner

RET (multiple values)
1. `number` canvas normalized displacement -- `distance`. Distance traveled so far
2. `number` canvas normalized displacement/second -- `currentSpeed`. Speed at that time

The final travel distance converges to `speed / friction`. Conversely, if the stopping distance is known, you can set `speed = distance * friction`.

Choosing between it and `mt.ease.out_expo`: easing represents progress from 0→1 over a fixed duration, whereas this function treats initial velocity and friction as independent physical quantities. This allows adjustments such as **changing only the initial velocity while preserving the character of the deceleration**.

```lua
-- Slide in from the left and stop through friction
local travelled = mt.friction_decay(ctx.time - startTime, 2.0, 4.0)
character.offset_x = 0.5 - 0.5 + travelled
```

> [!NOTE]
> When `friction` is extremely small (`1e-4` or less), motion is treated as uniform linear motion. This avoids numerical cancellation and is effectively equivalent to frictionless motion in practical use.

### 9. Color

See “color” in Concepts for the color format.
RGBA is the color storage format. When calculating colors, select the color space that matches the intent.

#### `mt.color.resolve_fill(ctx, target, options?)`

Resolves the fill applied to a character or part and returns its base color,
fill mode, and object opacity. It is available in `OnLayout` and `OnPath`.
With no `options` it returns the final fill the target is drawn with; `options.level`
stops the inheritance at an earlier tier (see Style inheritance).

ARGS
- `ctx` (`table`) Current OnLayout or OnPath context
- `target` (`character | part`) An element of `ctx.chars` or `ctx.parts`
- `options` (`table` default `nil`) (`12+`) `{ level = "global" | "character" | "part" }`

##### Return Values

- `color` : `color` : Copy of the resolved solid color, or of `ctx.global.fill.color`, which supplies the starting color for a Global gradient or Crayon
- `mode` : `string` : `"solid"` / `"gradient"` / `"crayon"` / `"transparent"`
- `opacity` : `number` : 0–1 : Product of the Global, owning-character, and target-part `opacity` values, clamped to 0–1

For a part, resolution checks `part.fill.use`, then the owning character's
`fill.use`, then Global. For a character, it checks only the character and
Global; individual colors on descendant parts are not included. When an
individual color is selected, `mode` is always `"solid"`.

When the fill reaches Global, the mode is `"transparent"` if
`fill.transparent` is `true`, `"solid"` if `gradient.color_space` is `"none"`,
`"crayon"` if it is `"crayon"`, and `"gradient"` for every other gradient
mode.

The returned `opacity` does not include the color's own `a` component. The
returned color is a new table, so modifying it does not affect the original
`fill.color`.

```lua
for _, part in mt.each_part(ctx) do
    local color, mode, opacity = mt.color.resolve_fill(ctx, part)
    if mode == "gradient" and opacity > 0.0 then
        -- This part is filled by the Global gradient.
        print(color.r, ctx.global.gradient.end_color.r)
    end
end
```

#### Color construction, decomposition, and interpolation

The functions below return new tables and do not modify their arguments. `from_*` constructs a color
from components, `to_*` decomposes a color into a component table, and `lerp*` constructs a color from
two colors and `t`. An omitted `alpha`, or a missing `a` in a color passed to `to_*`, becomes `1.0`.
`hue` uses one full turn as its unit; out-of-range input wraps to `[0, 1)`. No interpolation function
clamps `t`. OKHSV/OKHSL `saturation`, `value`, and `lightness` inputs are constrained to 0–1.
`lerp_oklch` / `lerp_okhsv` / `lerp_okhsl` take the shortest hue path by default and inherit the colored
endpoint's hue when the other endpoint is achromatic. An exact half-turn preserves the sign of the hue difference.
`lerp_oklch(from, to, t, "long")` takes the longer hue path; `"short"` or omission
keeps the shorter path. Equal hues make one increasing revolution with `"long"`, including hues inherited
from a colored endpoint. Other `hueMethod` values are errors.

- `mt.color.lerp(from, to, t)` — Linearly interpolates RGBA components.
- `mt.color.from_hsv(hue, saturation, value, alpha?)` — Constructs a color from normalized HSV.
- `mt.color.with_alpha(color, alpha)` — Preserves RGB and replaces only alpha.
- `mt.color.from_oklch(lightness, chroma, hue, alpha?)` — Constructs a color from OKLCH. Chroma is normally about 0–0.4, and RGB output is constrained to 0–1.

- `mt.color.from_oklab(lightness, aAxis, bAxis, alpha?)` — Creates an RGBA color from OKLab components. RGB output is constrained to 0–1.
- `mt.color.to_oklab(color)` — Converts to `{ lightness, a, b, alpha }`. Input RGB is not clamped.
- `mt.color.to_oklch(color)` — Converts to `{ lightness, chroma, hue, alpha }`. Achromatic hue is 0.
- `mt.color.from_okhsv(hue, saturation, value, alpha?)` — Creates a color from gamut-normalized OKHSV.
- `mt.color.to_okhsv(color)` — Converts to `{ hue, saturation, value, alpha }`. Achromatic hue is 0.
- `mt.color.from_okhsl(hue, saturation, lightness, alpha?)` — Creates a color from gamut-normalized OKHSL.
- `mt.color.to_okhsl(color)` — Converts to `{ hue, saturation, lightness, alpha }`. Achromatic hue is 0.
- `mt.color.lerp_oklab(from, to, t)` — Interpolates in Cartesian OKLab coordinates.
- `mt.color.lerp_oklch(from, to, t, hueMethod?)` — Interpolates in OKLCH. `hueMethod` is `"short"` (default) or `"long"`.
- `mt.color.lerp_okhsv(from, to, t)` — Interpolates in OKHSV along the shortest hue path.
- `mt.color.lerp_okhsl(from, to, t)` — Interpolates in OKHSL along the shortest hue path.

### 10. Style Inheritance

Fill, stroke, shadow, blur and texture are inherited through three tiers: `ctx.global`, the owning character, and
the part. An element's `use` flag replaces the whole group it inherits, so `shadow.use` switches the shadow color
and its blur together. The resolve functions return the group an element is drawn with:
`mt.color.resolve_fill`, `mt.shadow.resolve`, `mt.blur.resolve`, `mt.stroke.resolve` and `mt.texture.resolve`.

With no `options` they return the final value of the target: for a part this includes its own override, and for a
character it does not include the overrides of its parts. `options.level` stops the inheritance at an earlier tier:

- `"global"` : The frame's value, `ctx.global`
- `"character"` : The value after the owning character's override
- `"part"` : The value after the part's override (a part's default)

A character's default level is `"character"`, and a level below the target's own tier is an error. To change one
property of an overridden group, read the tier above with `level`, set `use`, and write the values back:

```lua
function OnLayout(ctx)
    for _, part in mt.each_part(ctx) do
        local shadow = mt.shadow.resolve(ctx, part, { level = "character" })
        -- Add blur to this part's shadow only; keep the inherited color.
        part.shadow.use = true
        part.shadow.color = shadow.color
        part.shadow.blur_x = shadow.blur_x + 0.2
        part.shadow.blur_y = shadow.blur_y + 0.2
    end
end
```

> [!NOTE]
> A part with `shadow.use = true` casts a shadow even while the global shadow is off, as with an individual shadow color.

All of them are available in `OnLayout` and `OnPath`, and the returned colors are new tables, so modifying them
does not affect the original settings.

Arguments of every resolve function:

- `ctx` : `table` : Required : Current OnLayout or OnPath context
- `target` : `character | part` : Required : An element of `ctx.chars` or `ctx.parts`
- `options` : `table` : `nil` : `{ level = "global" | "character" | "part" }`

#### `mt.shadow.resolve(ctx, target, options?)`

Resolves the shadow. Returns `{ color, blur_x, blur_y, glow }`: the shadow color, the horizontal and vertical blur in em, and the glow strength.

#### `mt.blur.resolve(ctx, target, options?)`

Resolves the blur of the text itself. Returns `{ amount_x, amount_y, glow }`: the blur in em and the glow strength.

#### `mt.stroke.resolve(ctx, target, options?)`

Resolves the stroke. Returns `{ width, gap, color, outer_width, outer_color }`. `order`, `join` and `miter_limit`
exist only on `ctx.global.stroke`.

#### `mt.texture.resolve(ctx, target, options?)`

Resolves the texture. Returns `{ type, p1, p2, p3, p4, color }`.

### 11. Easing

`mt.ease.<name>(t)` accepts progress `t` (normally 0–1) and returns eased progress.
A typical use is to add character to the linear progress returned by `mt.stagger` or `mt.cycle`.
Except for `mt.ease.cubic_bezier`, the input `t` is not clamped automatically. To constrain it to 0–1, pass it through `mt.saturate` first.

Names combine a curve type and a direction.

- `in_` — Acceleration (starts slowly and ends quickly). Suitable for exits
- `out_` — Deceleration (starts quickly and stops slowly). Suitable for entrances
- `in_out_` — Accelerates in the first half and decelerates in the second

- Linear : Constant speed (no change)
- Quad : Gentlest acceleration and deceleration
- Cubic : Standard acceleration and deceleration. Start here when unsure
- Quart : Steeper than Cubic
- Sine : Extremely gentle easing derived from a sine wave
- Circ : Circular-arc curve that rises sharply at the endpoint
- Expo : Extremely strong exponential easing
- Back : **Overshoots once and then returns** (extends outside 0–1)
- Elastic : **Oscillates like a spring before settling** (extends outside 0–1)
- Bounce : Bounces as if against a floor

Note that Back and Elastic can return values outside the 0–1 range; that excursion is the essence of their effect.

Every function below takes one argument `t` (`number`, progress, not clamped) and returns a `number`, except `mt.ease.cubic_bezier`, whose signature is listed with it.

- `mt.ease.linear(t)` : Constant-speed easing that returns the input progress unchanged. : Same value as the input `t`
- `mt.ease.in_quad(t)` : Quadratic easing that starts slowly and gradually accelerates. : Progress calculated as `t²`
- `mt.ease.out_quad(t)` : Quadratic easing that starts quickly and gradually decelerates. : Progress calculated as `1 - (1 - t)²`
- `mt.ease.in_out_quad(t)` : Quadratic easing that accelerates in the first half and decelerates in the second. : Progress that symmetrically combines `in_quad` and `out_quad` around `t = 0.5`
- `mt.ease.in_cubic(t)` : Cubic easing that starts slowly and gradually accelerates. : Progress calculated as `t³`
- `mt.ease.out_cubic(t)` : Cubic easing that starts quickly and gradually decelerates. : Progress calculated as `1 - (1 - t)³`
- `mt.ease.in_out_cubic(t)` : Cubic easing that accelerates in the first half and decelerates in the second. : Progress that symmetrically combines `in_cubic` and `out_cubic` around `t = 0.5`
- `mt.ease.in_quart(t)` : Quartic easing that starts slowly and accelerates more steeply than Cubic. : Progress calculated as `t⁴`
- `mt.ease.out_quart(t)` : Quartic easing that starts quickly and decelerates more steeply than Cubic. : Progress calculated as `1 - (1 - t)⁴`
- `mt.ease.in_out_quart(t)` : Quartic easing that accelerates in the first half and decelerates in the second. : Progress that symmetrically combines `in_quart` and `out_quart` around `t = 0.5`
- `mt.ease.in_sine(t)` : Sine-wave-derived easing that accelerates extremely gently. : Progress calculated as `1 - cos(t × π / 2)`
- `mt.ease.out_sine(t)` : Sine-wave-derived easing that decelerates extremely gently. : Progress calculated as `sin(t × π / 2)`
- `mt.ease.in_out_sine(t)` : Sine-wave-derived easing that accelerates in the first half and decelerates in the second. : Progress that symmetrically combines `in_sine` and `out_sine` around `t = 0.5`
- `mt.ease.in_circ(t)` : Circular-arc easing that accelerates sharply toward the endpoint. : Progress calculated as `1 - √(1 - t²)`
- `mt.ease.out_circ(t)` : Circular-arc easing that advances sharply immediately after the start and then decelerates. : Progress calculated as `√(1 - (1 - t)²)`
- `mt.ease.in_out_circ(t)` : Circular-arc easing that accelerates in the first half and decelerates in the second. : Progress that symmetrically combines `in_circ` and `out_circ` around `t = 0.5`
- `mt.ease.in_expo(t)` : Exponential easing that accelerates extremely strongly toward the endpoint. : `0` when `t <= 0`; otherwise progress calculated as `2^(10t - 10)`
- `mt.ease.out_expo(t)` : Exponential easing that advances extremely strongly immediately after the start and then decelerates. : `1` when `t >= 1`; otherwise progress calculated as `1 - 2^(-10t)`
- `mt.ease.in_out_expo(t)` : Exponential easing that accelerates extremely strongly in the first half and decelerates extremely strongly in the second. : Progress that symmetrically combines `in_expo` and `out_expo` around `t = 0.5`
- `mt.ease.in_back(t)` : Easing that moves slightly backward in the negative direction immediately after the start, then accelerates toward the endpoint. : Progress that overshoots below 0 near the start
- `mt.ease.out_back(t)` : Easing that passes slightly beyond the endpoint and then decelerates while returning. : Progress that overshoots above 1 near the endpoint
- `mt.ease.in_out_back(t)` : Easing that overshoots near both the start and the endpoint. : Progress that symmetrically combines `in_back` and `out_back` around `t = 0.5`
- `mt.ease.in_elastic(t)` : Easing that accelerates toward the endpoint while oscillating with increasing amplitude. : Progress that oscillates outside the 0–1 range. Returns `t` unchanged when `t <= 0` or `t >= 1`
- `mt.ease.out_elastic(t)` : Easing that decelerates and converges while oscillating around the endpoint. : Progress that oscillates outside the 0–1 range. Returns `t` unchanged when `t <= 0` or `t >= 1`
- `mt.ease.in_out_elastic(t)` : Easing that accelerates while oscillating in the first half, then decelerates and converges while oscillating in the second. : Progress that symmetrically combines `in_elastic` and `out_elastic` around `t = 0.5`
- `mt.ease.in_bounce(t)` : Easing that bounces at the starting side before moving toward the endpoint. : Time-reversed `out_bounce` progress
- `mt.ease.out_bounce(t)` : Easing that decelerates toward the endpoint with multiple bounces as if against a floor. : Progress representing bounces with a piecewise quadratic function
- `mt.ease.in_out_bounce(t)` : Easing that bounces at both the starting and ending sides. : Progress that symmetrically combines `in_bounce` and `out_bounce` around `t = 0.5`
- `mt.ease.cubic_bezier(x1, y1, x2, y2, t)` : Evaluates a cubic Bézier curve compatible with the CSS `cubic-bezier()` timing function. Use it to specify arbitrary easing numerically when the predefined curves above are insufficient. : Progress on the specified Bézier curve

The three `circ` functions contain a square root, so normally constrain `t` to 0–1 before use.

##### `mt.ease.cubic_bezier` arguments

- `x1` / `y1` : `number` : Required : First control point
- `x2` / `y2` : `number` : Required : Second control point
- `t` : `number` : Required : Progress. Fixed at `0` when `t <= 0` and at `1` when `t >= 1`

When using it as a CSS-compatible monotonic timing curve, keep `x1` and `x2` within 0–1.

```lua
-- Same curve as CSS ease-in-out
local eased = mt.ease.cubic_bezier(0.42, 0.0, 0.58, 1.0, progress)
```

### 12. Reflow and Line-Based Grouping

#### `mt.layout.reflow(ctx, gap?, config?)`

For horizontal writing, uses `geometry.canvas_origin_*`; for vertical writing, uses `geometry.vertical_origin_*`. It applies the current `scale * stretch` to the advance while preserving spacing derived from shaping, kerning, tracking, and margins based on differences between adjacent natural origins. Per-character rotation and pivot are also included in origin alignment. This function does not equalize the distance between visible ink outlines.

ARGS
- `ctx` (`table`) `OnLayout` context
- `gap` (`number` Ratio of canvas width or height default `0.0`) Extra spacing added to adjacent advances. Positive values increase spacing in the direction of progression
- `config` (`table` default `nil`) Settings for reflow direction, targets, and fixed position

##### `config`

- `mode` : `string` : Determined from `ctx.global.vertical` : Direction to reflow: `"horizontal"` or `"vertical"`
- `targets` : `table` : All characters : Array of 1-based character indices to reflow. If characters between targets are skipped, their advances are included in the calculation, but their coordinates are not changed
- `anchor` : `integer` : First character in each line/column : Character index whose current transformed typesetting origin is fixed while characters are arranged on both sides

When `targets` is omitted, all characters are reflowed with each `line_index` treated as an independent line/column, and the first character of each is fixed. When `config.anchor` is specified, only the line containing that character uses it as the fixed character.

RET none

##### Changes

Rewrites `offset_x` and `offset_y` for the target characters. Call it after setting size, rotation, and pivot animations, as the final layout operation for the frame.

ERRORS

- Specify `"horizontal"` or `"vertical"` for `mode`.
- Indices in `targets` must be within the valid range, strictly ascending, and free of duplicates.
- All characters included in `targets` must belong to the same `line_index`.
- When `targets` is specified, `anchor` must identify a character included in that array.
- When `targets` is omitted, `anchor` must be a valid character index.

```lua
mt.layout.reflow(ctx, 0.02, {
    targets = {3, 4, 7, 8}, -- Include 5 and 6 in the advance, but do not move them
    anchor = 3,
})
```

#### `mt.layout.group_by_line(ctx)`

Groups shaped characters by `line_index` and returns them in the host’s reading order.
The groups represent lines in horizontal writing and columns in vertical writing. It does not modify layout or character properties.

ARGS
- `ctx` (`table`) `OnLayout` context

RET
- `table` -- Array containing one group per `line_index`, ordered by typeset line/column order

Each group has the following fields.

- `line_index` : `integer` : Index of the line/column corresponding to the group
- `item_count` : `integer` : items : Number of characters in the group
- `items` : `table` : Array of characters in reading order

```lua
local columns = mt.layout.group_by_line(ctx)
for columnOrder, column in ipairs(columns) do
    for indexInColumn, character in ipairs(column.items) do
        local start = (columnOrder - 1) * 0.2 + (indexInColumn - 1) * 0.05
        character.opacity = mt.saturate((ctx.time - start) / 0.4)
    end
end
```

### 13. Canvas Position, Distance, and Pivot

#### `mt.layout.place_2d(ctx, item, canvasX, canvasY)`

Precisely places the anchor of a character or part at a canvas normalized position **before 3D, camera, projection, and Deform are applied**. It composes and inverts the `offset` / `pivot` / `rotation` / `scale` / `stretch` of Global, the owning character, and the target itself using the same hierarchy and the same pixel coordinates for a non-square canvas as Native rendering.

- Character anchor: natural ink bounds center `geometry.bounds_center_x/y`
- Part anchor: part-local natural center (the local origin of the rendered path)
- Shape anchor: the shape's position, the origin of its path (the canvas center until it is offset). Only the shape's own `offset` / `pivot` / `rotation` / `scale` / `stretch` count, because the Global does not reach a shape

ARGS
- `ctx` (`table`) `OnLayout` context
- `item` (`table`) Target character, part or shape
- `canvasX` / `canvasY` (`number` canvas normalized position) Destination coordinates

RET (multiple values)
1. `number` canvas normalized displacement -- The assigned `offsetX`
2. `number` canvas normalized displacement -- The assigned `offsetY`

##### Changes

Directly updates the target’s `offset_x` and `offset_y`.

ERRORS

If `scale * stretch` is 0 anywhere in the transform hierarchy, the transform cannot be inverted and an error occurs.

```lua
mt.layout.place_2d(ctx, ctx.chars[1], 0.8, 0.8)
mt.layout.place_2d(ctx, ctx.parts[1], 0.5, 0.5)
```

#### `mt.layout.get_canvas_position_2d(ctx, item)`

Gets the current Canvas coordinates `(canvasX, canvasY)` of a character or part anchor before 3D transforms, in the normalized Y-up coordinate system from 0.0 to 1.0. The function automatically determines whether `item` is a character (`ctx.chars[i]`) or a part (`ctx.parts[j]`).

ARGS
- `ctx` (`table`) `OnLayout` context
- `item` (`table`) Target character or part

RET (multiple values)
1. `number` canvas normalized position -- Anchor `canvasX`
2. `number` canvas normalized position -- Anchor `canvasY`

```lua
-- Get the Canvas position of a character
local charX, charY = mt.layout.get_canvas_position_2d(ctx, ctx.chars[1])

-- Get the Canvas position of a part (detected automatically)
local partX, partY = mt.layout.get_canvas_position_2d(ctx, ctx.parts[1])
```

#### `mt.layout.match_pose(ctx, destination, source, options?)`

Synchronizes the current pose of `source` to a destination of the same kind. It accepts two Characters,
or two Parts owned by the same Character. It is available only in `OnLayout`. The application order is size,
rotation, depth, opacity, then position.

- `position` : boolean : `true` : Synchronize the pre-3D canvas position
- `position_delta_x` / `position_delta_y` : number : `0.0` : Untransformed-em displacements along the source-local X/Y axes
- `rotation` : boolean : `true` : Synchronize 2D rotation
- `rotation_offset` : number : `0.0` : Degrees added after synchronization
- `size` : string : `"copy"` : `"none"` / `"copy"` / `"match_bounds"`
- `size_scale_x` / `size_scale_y` : number : `1.0` : Positive per-axis multipliers
- `depth` : boolean : `true` : Synchronize `z` / `yaw` / `pitch`
- `z_offset` : number : `0.0` : Canvas-normalized displacement added to Z after synchronization
- `yaw_offset` / `pitch_offset` : number : `0.0` : Angles in degrees added after synchronization
- `opacity` : boolean : `false` : Synchronize opacity
- `opacity_scale` : number : `1.0` : Non-negative opacity multiplier

`match_bounds` applies the ratio of the natural bounds widths and heights to stretch. When a source ink-bounds
axis is zero, it uses the logical character cell: horizontal advance for X in horizontal writing, vertical
advance for Y in vertical writing, and one em for a zero advance or the cross axis. Parts have no advance and
use one em. A zero destination-bounds axis keeps its existing effective scale while the other axis and pose
still synchronize. The destination pivot is not changed.

Position deltas use 1.0 as one untransformed em on both axes and do not use screen-fixed X/Y axes. For a Character they pass through the Global and source
Character rotation, scale, and stretch. For a Part they additionally pass through the owning Character and
source Part pose. Rotating or scaling the source therefore changes the delta direction and length.
`rotation_offset` and `size_scale` adjust the destination and are not included in the delta transform.

```lua
mt.layout.match_pose(ctx, ctx.chars[4], ctx.chars[1], {
    size = "match_bounds",
    size_scale_x = 1.15,
    size_scale_y = 1.2,
    position_delta_y = -0.75,
})
```

#### `mt.layout.canvas_to_offset_2d(ctx, item, canvasX, canvasY)`

Calculates and returns the `offset_x` and `offset_y` required to place a character or part at the specified Canvas coordinates `(canvasX, canvasY)` before 3D transforms, without rewriting the properties themselves. The type is detected automatically from the character or part passed as `item`.

ARGS
- `ctx` (`table`) `OnLayout` context
- `item` (`table`) Target character or part
- `canvasX` / `canvasY` (`number` canvas normalized position) Destination coordinates

RET (multiple values)
1. `number` canvas normalized displacement -- Required `offsetX`
2. `number` canvas normalized displacement -- Required `offsetY`

The target’s fields are not modified.

ERRORS

An error occurs if `scale * stretch` is 0 in the parent hierarchy being inverted.

```lua
-- Invert the transform to obtain the offset needed to place a character at Target Canvas coordinates (0.5, 0.8)
local cox, coy = mt.layout.canvas_to_offset_2d(ctx, ctx.chars[1], 0.5, 0.8)

-- Invert the transform to obtain the offset needed to place a part at Target Canvas coordinates (0.2, 0.3) (detected automatically)
local pox, poy = mt.layout.canvas_to_offset_2d(ctx, ctx.parts[1], 0.2, 0.3)
```

#### `mt.layout.radial_distance(ctx, canvasX, canvasY, centerX?, centerY?)`

Returns the distance from the center of a radial effect to the specified Canvas coordinates. If `centerX` / `centerY` are omitted, the center of the screen `(0.5, 0.5)` is used.

ARGS
- `ctx` (`table`) Context containing canvas information
- `canvasX` / `canvasY` (`number` canvas normalized position) Coordinates to measure
- `centerX` / `centerY` (`number` canvas normalized position default `0.5`) Center of the effect

RET
- `number` Ratio of canvas height -- Aspect-ratio-corrected distance from the center

> [!IMPORTANT]
> **The aspect ratio is corrected.** In normalized Canvas coordinates, a physical length of 1.0 differs between the horizontal and vertical axes. If distance is calculated simply as `sqrt(dx² + dy²)`, intended concentric circles become **squashed into ellipses** in a wide project such as 16:9. This function corrects the horizontal direction by multiplying it by `ctx.canvas.aspect_ratio`, so the returned distance is always based on true circles.

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

#### `mt.layout.pivot_at_2d(ctx, item, anchor)`

Automatically determines whether the target is a character or part and sets its pivot to a semantic 2D position. It corrects `offset_x/y` by the difference between the local 2D matrices before and after the change, so the current pose before 3D application from rotation, scale, and stretch does not move.
Global is not supported. Preserving the visual result after yaw, pitch, z, camera, or projection is outside its scope.

ARGS
- `ctx` (`table`) `OnLayout` context
- `item` (`table`) Target character or part
- `anchor` (`string`) Name of the semantic 2D position to set

RET none

##### Changes

Sets the target’s `pivot_x` and `pivot_y`, then corrects `offset_x` and `offset_y` so the pose does not move.

##### `anchor`

Characters and parts share these anchors:

- `"center"`: center of the ink bounds
- `"top"` / `"bottom"`: horizontal center at the top/bottom edge of the ink bounds
- `"left"` / `"right"`: left/right edge at the vertical center of the ink bounds
- `"top_left"` / `"top_right"` / `"bottom_left"` / `"bottom_right"`: corresponding corner of the ink bounds

Characters additionally support these anchors:

- `"baseline_left"` / `"baseline"` / `"baseline_right"`: left edge/center/right edge of the ink bounds on the horizontal baseline
- `"typesetting_origin"`: character-cell left edge on the horizontal baseline
- `"vertical_start"` / `"vertical_center"` / `"vertical_end"`: vertical column axis at the character-cell start/center/end

Existing pivot values are not 0–1 ratios within the bounds. `0.5` is the natural center; X is displacement as a ratio of canvas width, and Y is displacement as a ratio of canvas height. This function converts the bounds dimensions, character typesetting origin, and differing natural centers of characters and parts into the existing pivot units.

```lua
mt.layout.pivot_at_2d(ctx, character, "top")
character.rotation = math.sin(ctx.time * 3.0) * 8.0
```

### 14. Bounds After 2D Transforms

#### `mt.layout.measure_bounds_2d(ctx, targets?, targetType?, space?)`

`space` (level `12+`) defaults to `"canvas"`. `"before_global_rotation"` removes only Global rotation around position + pivot while measuring; scale, stretch, individual transforms, and layout are preserved. Results remain Canvas-normalized Y-up coordinates. To draw in that frame, rotate the resulting geometry back around the same Global rotation center. Context and Inspector values are never modified.

Transforms the natural bounding rectangles of the specified targets through the complete Global→character→part 2D hierarchy, then returns canvas-axis-aligned bounds enclosing all their vertices. When characters are specified, the natural bounds of their owned parts are combined; characters with no parts use the character’s natural bounds. Call it after writing the target fields.

These bounds are **before 3D, camera, projection, and Deform are applied**. They do not include stroke or shadow overhang, nor path-tight bounds for outlines containing whitespace within their natural bounding rectangle. For this stage and definition, the result is not an approximation: it incorporates rotation, pivot, negative stretch, parent-character transforms, and Global transforms.

ARGS
- `ctx` (`table`) `OnLayout` context
- `targets` (`table | nil` default All) Array of 1-based character or part indices. `nil` selects every target of the requested type
- `targetType` (`string` default `"character"`) Target type: `"character"` or `"part"`
- `space` (`string` default `"canvas"`) `"canvas"` or `"before_global_rotation"`

RET (one of)
- `table` -- Bounds enclosing all valid targets
- `nil` -- If there are no valid targets

The bounds table has the following fields. All coordinate systems are Y-up.

- `left` / `right` : `number` : canvas normalized position : Left and right edges
- `bottom` / `top` : `number` : canvas normalized position : Bottom and top edges
- `center_x` / `center_y` : `number` : canvas normalized position : Center of the bounds
- `width` / `height` : `number` : canvas normalized displacement : Width and height of the bounds

ERRORS

Selecting all targets by omitting `targets` is available.
`targetType = "character"` selects every character, while `"part"` selects
every part. An empty table `{}` does not select all; as before, it selects
nothing and returns `nil`.

All-character selection includes characters with no parts and uses their
natural character bounds. All-part selection includes only elements present
in `ctx.parts`. Visibility, opacity, and write-on state do not affect target
selection; this function measures the specified geometry.

```lua
local bounds = mt.layout.measure_bounds_2d(ctx, {1, 2, 3})
if bounds then
    mt.layout.place_2d(ctx, ctx.chars[4], bounds.center_x, bounds.top + 0.05)
end

local allCharacterBounds = mt.layout.measure_bounds_2d(ctx)
local allPartBounds = mt.layout.measure_bounds_2d(ctx, nil, "part")
```

### 15. Alignment on Paths

#### `mt.layout.queue_on_path(ctx, path, options?)`

Arranges characters (or parts) on a path created by `mt.path.arc_length` **in reading order**, and returns the distance ratio (0–1) occupied by each element.

Spacing is derived from the origin spacing that the **host actually typeset**, using the same method as `mt.layout.reflow`. Parameter settings such as `tracking`, per-character `margins`, and kerning are therefore reflected directly in the character advance along the path. `options.gap` is **additional spacing** added on top of that, so when `gap` is `0`, elements are arranged according to the host’s character advance.

ARGS
- `ctx` (`table`) `OnLayout` context
- `path` (`table`) Return value of `mt.path.arc_length`
- `options` (`table` default `nil`) Placement settings
- `options.align` (`string` default `"end"`) Position at which to place the string. Specify `"end"`, `"start"`, or `"center"`
- `options.gap` (`number` Ratio of canvas width default `0.0`) Additional spacing added to the host’s character advance
- `options.mode` (`string` default `"horizontal"`) Host typesetting direction: `"horizontal"` or `"vertical"`
- `options.target_type` (`string` default `"character"`) Target type: `"character"` or `"part"`
- `options.targets` (`table` default All elements) Array of target indices in reading order

RET
- `table` 0–1 -- `slots` array indexed like `ctx.chars` or `ctx.parts`, providing the distance ratio occupied by each element on the path

`slots` represents positions on the path, not animation progress.

##### Direction of Travel and Reading Order

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

- Omitted (ascending index) : Reversed (read right→left) : Character 1
- Reverse reading order : Correct (read left→right) : Last character

`align` is likewise relative to the direction of travel. `"end"` places the end of the string at the **end of the path**, so on a path traveling right to left, the end of the string appears on the **left side** of the screen.

- Left→right : Right side of the screen
- Right→left : Left side of the screen

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

### 16. Motion Paths

These curve-evaluation APIs represent motion along control points, such as “flowing in” or “landing along an arc.”

The coordinate system is not fixed. Points are plain `{ x, y }` tables. The functions accept whichever coordinate system the caller passes, such as normalized offset coordinates, canvas pixels, or character-local coordinates, and return values in the same coordinate system.

> [!NOTE]
> **When assigning returned values directly to `offset_x` / `offset_y`, specify the points in offset units as well (the canvas normalized displacement whose neutral value is `0.5`).** In the example below, the landing point is `{ x = 0.5, y = 0.5 }` (zero displacement), so `character.offset_x = x` lands directly at the natural position. If absolute canvas coordinates or zero-based local coordinates are assigned to offset unchanged, the character will move to an unintended position.

Every function returns four values: `x, y, tangentX, tangentY`. `tangentX` / `tangentY` are raw, unnormalized derivatives that also include travel speed. To obtain the direction angle, use `math.deg(math.atan(tangentY, tangentX))`; to obtain a unit vector, divide by `local length = math.sqrt(tangentX^2 + tangentY^2)`.

#### `mt.path.bezier(p0, p1, p2, p3, t)`

Returns the coordinates and tangent on a cubic Bézier curve defined by four points.

ARGS
- `p0` (`table` coordinates) Starting point `{ x, y }`
- `p1` (`table` coordinates) Control point near the start `{ x, y }`
- `p2` (`table` coordinates) Control point near the end `{ x, y }`
- `p3` (`table` coordinates) End point `{ x, y }`
- `t` (`number` 0–1) Position on the curve. Values outside the range are not clamped and are extrapolated unchanged

RET (multiple values)
1. `number` As defined by the input coordinates -- `x` on the curve
2. `number` As defined by the input coordinates -- `y` on the curve
3. `number` As defined by the input coordinates -- Tangent `tangentX`
4. `number` As defined by the input coordinates -- Tangent `tangentY`

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

#### `mt.path.catmull_rom(points, t)`

Returns the coordinates and tangent on a Catmull-Rom spline passing through any number of control points. Unlike a Bézier curve, this curve passes exactly through every point in the list.

ARGS
- `points` (`table` coordinates) 1-based array containing at least two `{ x, y }` points through which the curve passes
- `t` (`number` 0–1) Progress across the entire curve. Clamped to 0–1

RET (multiple values)
1. `number` As defined by the input coordinates -- `x` on the curve
2. `number` As defined by the input coordinates -- `y` on the curve
3. `number` As defined by the input coordinates -- Tangent `tangentX`
4. `number` As defined by the input coordinates -- Tangent `tangentY`

ERRORS

`points` must contain at least two points.

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

#### `mt.path.arc_length(points, aspectRatio?, options?)`

Constructs an **arc-length-parameterized** path from control points. The two functions above evaluate using curve parameter `t`, but **equal intervals of `t` are not equal distances**. Samples bunch together where the curve bends, so uses that require spacing by distance, such as queues, character advance along a path, or constant-speed motion, require a cumulative-length table. This function constructs that table once and provides distance-based lookup.

Passing `ctx.canvas.aspect_ratio` as `aspectRatio` multiplies X differences by it to equalize the meaning of distance on the horizontal and vertical axes. If omitted, distance is measured directly in normalized units, causing spacing to expand or contract on a non-square canvas.

ARGS
- `points` (`table` coordinates) 1-based control-point array. Specifying canvas normalized coordinates allows use with `mt.layout.place_2d` and `mt.layout.queue_on_path`
- `aspectRatio` (`number` default `1.0`) Aspect ratio multiplied into X-axis distances. Normally pass `ctx.canvas.aspect_ratio`
- `options` (`table` default `nil`) Settings specifying the curve type
- `options.kind` (`string` default `"catmull_rom"`) `"catmull_rom"` or `"bezier"`

RET
- `table` -- Path object providing distance-based lookup

The path object has the following methods.

- `path:length()` : `number` : As defined by the input coordinates : Total path length corrected for aspect ratio
- `path:at_distance(distanceRatio)` : Three `number` values : As defined by the input coordinates, degrees : `x`, `y`, and `headingDegrees` at distance ratio 0–1

ERRORS

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

### 17. Path Creation and Editing

#### `mt.svg_path(source, optionsOrSourceUnitsPerEm?)`

Converts a string in the same format as an SVG `d` attribute into a reusable, read-only path template.
As a simplified SVG-compatible implementation, it supports absolute and relative `M` / `L` / `H` / `V` / `Q` / `T` / `C` / `S` / `Z` commands and consecutive coordinate sets. Elliptical arcs `A` / `a` are not supported.

ARGS
- `source` (`string`) SVG path data
- `optionsOrSourceUnitsPerEm` (`number` / `table` default `nil`) Number of source-data units per em, or `{ view_box, em_scale }`

RET
- `MtDrawingPath` -- Read-only path template that can be passed to `path:assign(template)`

##### Normalization Settings

When a number is specified, it is treated as the number of source-data units per em and normalized to 1000 units (for example, use `mt.svg_path(source, 24)` to treat 24 units as 1 em).

When `view_box = { minX, minY, width, height }` is specified, the viewBox center is moved to the origin, and the longest side is scaled to `em_scale` em while preserving the aspect ratio. The default `em_scale` is `1.0`.

ERRORS

- A numeric units-per-em value must be a finite positive number.
- `view_box` must contain four finite numbers, and its width and height must be positive.
- `em_scale` must be a finite positive number.
- `units_per_em` cannot be specified in the configuration table. Use the numeric form or `em_scale`.

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

##### Notes

For a static SVG string, convert it with `mt.svg_path` outside the function and retain it in a `local` variable to avoid reparsing it every frame.

#### `mt.drawing_path()`

Creates an empty mutable `MtDrawingPath`. It is available at top level and in every hook. Coordinates use
Y-down part-local space where 1000 units equal 1 em. Build a shape with the existing construction methods
and pass it to APIs such as `ctx.glyphs:declare({ path = path })`.

```lua
local diamond = mt.drawing_path()
diamond:move_to(0, -500)
diamond:line_to(500, 0)
diamond:line_to(0, 500)
diamond:line_to(-500, 0)
diamond:close()
```

#### Drawing Path Editing API

The `path` of a part obtained through `ctx.paths` can be edited with the following methods.

- `path:clear()` : Delete every command in the path
- `path:assign(template)` : Replace with a template created by `mt.svg_path`
- `path:set_svg(source)` : Parse SVG path data and replace the path
- `path:move_to(x, y)` : Add the starting point of a subpath
- `path:line_to(x, y)` : Add a line
- `path:quad_to(cx, cy, x, y)` : Add a quadratic Bézier curve
- `path:cubic_to(cx1, cy1, cx2, cy2, x, y)` : Add a cubic Bézier curve
- `path:close()` : Close the current subpath
- `path:bounds()` : Get tight bounds including curve extrema
- `path:map_points(callback)` : Transform every point without changing topology

##### Coordinate System

Path coordinates use normalized Y-down local coordinates with the part center as the origin, where 1000 units equal 1 em.
They are converted automatically to the actual font size at the API boundary and therefore do not depend on Canvas resolution.

##### Applying Changes

Because `ctx.paths` is reconstructed every frame, apply `path` changes every frame.
Parts to which changes are not applied revert to the original glyph outline.

#### `path:clear()`

Deletes all commands in the path.

RET none

##### Changes

Empties the target path and resets its coordinate-normalization settings to their initial values.

#### `path:assign(template)`

Replaces the path with the contents of a template created by `mt.svg_path`.

ARGS
- `template` (`MtDrawingPath`) Source path template to copy

RET none

##### Changes

Replaces the target’s path data and coordinate-normalization settings with the template contents.

#### `path:set_svg(source)`

Parses SVG path data and replaces the target path.

ARGS
- `source` (`string`) Path data in the same format as an SVG `d` attribute

RET none

##### Changes

Replaces the target path with the specified SVG path and resets its coordinate-normalization settings to their initial values.

#### `path:move_to(x, y)`

Adds a new subpath beginning at the specified coordinates.

ARGS
- `x` / `y` (`number` Path-local coordinates) Starting point of the subpath

RET none

##### Changes

Adds a move command to the target path.

ERRORS

Coordinates must be finite numbers.

#### `path:line_to(x, y)`

Adds a straight line from the current position to the specified coordinates.

ARGS
- `x` / `y` (`number` Path-local coordinates) End point of the line

RET none

##### Changes

Adds a line command to the target path.

ERRORS

Coordinates must be finite numbers.

#### `path:quad_to(cx, cy, x, y)`

Adds a quadratic Bézier curve from the current position to the specified end point.

ARGS
- `cx` / `cy` (`number` Path-local coordinates) Control point
- `x` / `y` (`number` Path-local coordinates) End point of the curve

RET none

##### Changes

Adds a quadratic Bézier command to the target path.

ERRORS

Coordinates must be finite numbers.

#### `path:cubic_to(cx1, cy1, cx2, cy2, x, y)`

Adds a cubic Bézier curve from the current position to the specified end point.

ARGS
- `cx1` / `cy1` (`number` Path-local coordinates) Control point near the current position
- `cx2` / `cy2` (`number` Path-local coordinates) Control point near the end point
- `x` / `y` (`number` Path-local coordinates) End point of the curve

RET none

##### Changes

Adds a cubic Bézier command to the target path.

ERRORS

Coordinates must be finite numbers.

#### `path:close()`

Closes the current subpath by connecting it to its starting point.

RET none

##### Changes

Adds a close command to the target path.

#### `path:bounds()`

Returns tight bounds including curve extrema as four values: `minimumX, minimumY, maximumX, maximumY`.
An empty path returns one `nil`. Values use the path's Y-down space where 1000 units equal 1 em. It works
wherever the path can be referenced, on both read-only templates and mutable paths.

#### `path:map_points(callback)`

Replaces anchors and control points in command order with the two coordinates returned by
`callback(x, y, point)`. Command kinds and counts, contours, and close state are preserved. The candidate
is committed only after every callback succeeds.
A standalone mutable path can use it wherever that path is retained; a `ctx.paths` target can use it in `OnPath`.

`point` is a reused read-only view with `index`, `command_index`, `contour_index`, `role`
(`anchor` / `control1` / `control2`), and `command` (`move` / `line` / `quad` / `cubic`). Limits are
4096 points per path and 16384 points per script execution. Re-entering or modifying the same receiver
inside its callback, or returning non-finite coordinates, raises an error and leaves the path unchanged.

```lua
path:map_points(function(x, y, point)
    return x, y + math.sin(point.index * 1.7 + ctx.progress * math.pi * 2) * 25
end)
```

### 18. UTF-8 Text Processing

#### `mt.text.slice(text, startChar, endChar?)`

Slices a string at UTF-8 code-point boundaries. Unlike Lua’s standard byte-based `string.sub`, it does not cut through an individual UTF-8 code point. Because it does not operate on grapheme clusters, it can split combining characters or ZWJ-joined emoji in the middle of what appears to be one character.
`ctx.chars[index].text` is a cluster after shaping and does not use the same index concept as this function.

ARGS
- `text` (`string`) Target string
- `startChar` (`integer`) Starting code-point index. 1-based and inclusive
- `endChar` (`integer` default End) Ending code-point index. 1-based and inclusive

RET
- `string` -- String sliced to the specified range. An empty string if the range is empty or invalid

#### `mt.text.classify(text)`

Classifies the first Unicode code point of a text cluster into a character-category name convenient for animation.

ARGS
- `text` (`string`) Text cluster to classify

RET
- `string` -- One of `"kanji"`, `"hiragana"`, `"katakana"`, `"punctuation"`, `"latin"`, `"digit"`, `"space"`, or `"other"`

```lua
for _, character in ipairs(ctx.chars) do
    if mt.text.classify(character.text) == "kanji" then
        character.scale = 1.2
    end
end
```

##### Notes

This is lightweight classification based on the first code point, not language detection across the entire grapheme cluster. Empty strings, emoji, combining marks, and anything else outside the defined ranges are classified as `"other"`.

### 19. Character and Part Selection

#### `mt.target.chars(ctx, specification, options?)`

Resolves a selection string to character numbers. The string uses the same grammar as the character and part target settings of the host, so a script can offer the same notation as an input.

- Tokens are separated by commas or whitespace.
- `c3` is character 3, `p2` is global part 2, and a bare number is a character in this function.
- `a-b` is an inclusive range. `c1-c3`, `p2-p5` and `2-4` are all valid. A bare end takes the kind of the other end, a reversed range is swapped, and a range whose ends have different kinds is ignored.
- A leading `!` excludes. An exclusion wins over every include, whatever the order.
- Numbers outside the text, malformed tokens and `0` are ignored.

A character is listed when at least one of its parts is selected, so `p5` lists the character that owns part 5.

ARGS
- `ctx` (`table`) `OnLayout` or `OnPath` context
- `specification` (`string`) Selection string
- `options` (`table` default `nil`) `{ empty = "none" | "all" }`. What a string that selects nothing resolves to. `"none"` (default) selects nothing and `"all"` selects every character. Exclusions still apply to `"all"`

RET
- `integer[]` -- Ascending character numbers (the `ctx.chars` indices), ready for `ipairs`

```lua
function OnLayout(ctx)
    for _, characterNumber in ipairs(mt.target.chars(ctx, "1-3, 6, !c2")) do
        ctx.chars[characterNumber].scale = 1.2
    end
end
```

#### `mt.target.parts(ctx, specification, options?)`

Resolves a selection string to global part numbers. The grammar is the one described for `mt.target.chars`, except that a bare number is a part. A character selector such as `c3` selects all of that character's parts.

ARGS
- `ctx` (`table`) `OnLayout` or `OnPath` context
- `specification` (`string`) Selection string
- `options` (`table` default `nil`) `{ empty = "none" | "all" }`. What a string that selects nothing resolves to. `"none"` (default) selects nothing and `"all"` selects every part. Exclusions still apply to `"all"`

RET
- `integer[]` -- Ascending global part numbers (the `ctx.parts` indices), ready for `ipairs`

```lua
function OnLayout(ctx)
    for _, partNumber in ipairs(mt.target.parts(ctx, "c1 p9")) do
        ctx.parts[partNumber].opacity = 0.5
    end
end
```

### 20. Clip Time

#### `mt.timeline.progress(ctx, fallbackDuration?)`

Gets the current progress from 0 to 1.

ARGS
- `ctx` (`table`) Context
- `fallbackDuration` (`number` seconds default `4.0`) Virtual clip length used for looping when the timeline is unavailable

RET
- `number` 0–1 -- Current progress

ERRORS

When the timeline is unavailable, specify a positive value for `fallbackDuration`.

#### `mt.timeline.duration(ctx, fallbackDuration?)`

Returns a positive host clip duration in seconds. When the host timeline is
unavailable, or its duration in seconds is not finite and positive, it returns
the requested fallback duration.

ARGS
- `ctx` (`table`) Context
- `fallbackDuration` (`number` seconds default `4.0`) Virtual clip length used when the timeline is unavailable

RET
- `number` seconds -- Host clip duration or fallback duration

ERRORS

An explicit `fallbackDuration` must be a finite positive number. When passed
a derived context returned by `window_ctx`, this function returns the duration
of that local time window.

```lua
local clipDuration =
    mt.timeline.duration(ctx, kFallbackClipLength)
```

#### `mt.timeline.remaining(ctx, fallbackDuration?)`

Returns the actual number of seconds remaining until the end of the clip. This is a basic building block for writing an outro (exit animation) in real time anchored to the endpoint (see the design rules for `ctx.timeline`).

ARGS
- `ctx` (`table`) Context
- `fallbackDuration` (`number` seconds default `4.0`) Virtual clip length used for looping when the timeline is unavailable

RET
- `number` seconds -- Time remaining until the end of the clip

```lua
-- Fade out during the final 0.5 seconds, regardless of clip length
local fade = mt.clamp(mt.timeline.remaining(ctx) / 0.5, 0.0, 1.0)
```

#### `mt.timeline.intro_outro_seconds(ctx, introSeconds, outroSeconds, fallbackDuration?)`

Returns progress for an intro anchored to the beginning of the clip and an outro anchored to the end, at a **fixed speed over the specified real number of seconds**. Changing the clip length does not change the transition speed. Only when the clip is shorter than `introSeconds + outroSeconds` are both intervals compressed proportionally to fit within the clip (automatic fast-forwarding).

ARGS
- `ctx` (`table`) Context
- `introSeconds` (`number` seconds) Intro length. Negative values are treated as `0`
- `outroSeconds` (`number` seconds) Outro length. Negative values are treated as `0`
- `fallbackDuration` (`number` seconds default `4.0`) Virtual clip length used when the timeline is unavailable

RET (multiple values)
1. `number` 0–1 -- `introProgress`. Intro progress
2. `number` 0–1 -- `outroProgress`. Outro progress

```lua
local intro, outro = mt.timeline.intro_outro_seconds(ctx, 0.8, 0.5)
character.offset_y = 0.5 + (1.0 - mt.ease.out_cubic(intro)) * 0.2
character.scale = character.scale * (1.0 - mt.ease.in_cubic(outro))
```

#### `mt.timeline.window_progress(ctx, start, duration)`

Converts a time window in the supplied context to linear progress from 0 to 1.
It returns exactly `0.0` before `start` and exactly `1.0` at or after
`start + duration`. Within the window, it returns `(ctx.time - start) / duration`.

ARGS
- `ctx` (`table`) Context from which time is read
- `start` (`number` seconds) Start time within the context
- `duration` (`number` seconds) Length of the time window

RET
- `number` 0–1 -- Linear progress through the window, clamped before and after it

ERRORS

- `ctx.time` must be a number.
- `start` must be a finite number.
- `duration` must be a finite positive number.

```lua
local appear =
    mt.timeline.window_progress(ctx, 0.5, 0.8)
local disappear =
    mt.timeline.window_progress(ctx, 4.0, 0.5)

character.opacity = appear * (1.0 - disappear)
```

##### Notes

Use this when only progress is needed. Use `mt.timeline.window_ctx` when time and
frame must also be localized before passing the context to time-dependent APIs.

#### `mt.timeline.window_ctx(ctx, start, duration)`

Creates a derived ctx for a specified time window from the original ctx. `start` is the starting time in seconds within the original ctx, and `duration` is a positive window length.
The derived ctx’s `time` is `ctx.time - start` clamped to `0–duration`; `frame`, `timeline.duration_*`, and `timeline.progress` are also converted to the same local time basis.
All other values, including canvas, Global, chars, and parts, are inherited from the original ctx.

ARGS
- `ctx` (`table`) Original context
- `start` (`number` seconds) Start time within the original context
- `duration` (`number` seconds) Length of the time window

RET
- `table` -- Derived context whose time-related values are remapped to the specified window

ERRORS

- `ctx.time` must be a number.
- `start` must be a finite number.
- `duration` must be a finite positive number.

```lua
local characterCtx =
    mt.timeline.window_ctx(ctx, (index - 1) * 0.08, 0.5)

local bounce = mt.bounce_y({ t = characterCtx.time })
local opacity = mt.ease.out_cubic(characterCtx.timeline.progress)
```

##### Notes

This API does not copy the original ctx or shared characters and parts. It is a shallow derived context that replaces only time-related values.

#### `mt.timeline.chain(ctx, initialValue, segments, options?)`

Evaluates pure functions for time intervals in sequence and passes the final return value of each completed interval to the next interval.
An `evaluate` before the current time is evaluated with that interval’s end context, while only the current interval is evaluated with its interval-local `ctx`.
The return value may be any Lua value, including a number, color, or table combining coordinates and transforms.

ARGS
- `ctx` (`table`) Original context
- `initialValue` (Any) Initial value passed to the first interval
- `segments` (`table`) Array of animation or hold intervals
- `options` (`table` default `nil`) Settings used when the timeline is unavailable
- `options.fallback_duration` (`number` seconds default `4.0`) Virtual clip length

RET
- Any -- Value of the last interval evaluated through the current time

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

##### Interval Context

`segmentCtx` inherits canvas, Global, chars, parts, and other values from the caller’s `ctx`, replacing only time-related values with those of the current interval.
It can be passed like a normal `ctx` to existing Level 3 APIs that read `ctx`, such as `mt.timeline.progress`.

- `segmentCtx.time` : `number` : seconds : Time since the interval began
- `segmentCtx.frame` : `number` : frame : Number of frames since the interval began
- `segmentCtx.fps` : `number` : fps : Same frame rate as the caller
- `segmentCtx.timeline.duration_seconds` : `number` : seconds : Logical duration of the interval
- `segmentCtx.timeline.duration_frames` : `number` : frame : Logical duration of the interval converted to frames
- `segmentCtx.timeline.progress` : `number` : 0–1 : Progress within the interval

##### Interval Forms

Each interval uses one of the following forms.

- Fixed-length animation : `{ duration = seconds, evaluate = function }` : Uses the return value of `evaluate(segmentCtx, previousValue)`
- Fixed-length hold : `{ hold = seconds }` : Retains the preceding value without calling a function
- Variable-length animation : `{ duration = "remaining", evaluate = function }` : Uses the remaining clip duration after fixed intervals are excluded
- Variable-length hold : `{ hold = "remaining" }` : Retains the preceding value for the remaining clip duration

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

ERRORS

- `ctx.time` must be a number, and `segments` and `options` must be tables.
- Each interval must specify exactly one of `duration` or `hold`.
- A `duration` interval requires an `evaluate` function, which cannot be specified for a `hold` interval.
- An interval length must be a finite number greater than or equal to 0, or `"remaining"`.
- Only one interval may specify `"remaining"`.
- `options.fallback_duration` must be a finite positive number.

> [!IMPORTANT]
> `evaluate` is reevaluated within the same frame to obtain the ending values of past intervals. Write it as a pure function that returns a value calculated from its arguments without directly modifying `ctx` or a character, and apply only the final result.
> Combine value-returning APIs such as `mt.bounce_y` with `segmentCtx.time`, rather than using APIs such as `mt.bounce_ground` that modify an item directly.
