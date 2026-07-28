-- Simulator-only companion to prelude.lua: the pure-Lua mt.svg_path /
-- MtDrawingPath implementation.
--
-- The host plugin does NOT load this file. There, mt.svg_path is implemented in
-- C++ (installPathScriptFunctions in src/scripting/ScriptPathBindings.cc) and
-- builds a real BLPath, so this Lua version would only be dead weight — the
-- CMake prelude embedding deliberately covers prelude.lua alone.
--
-- The simulator has no Blend2D, so it keeps the geometry as SVG path data and
-- lets the renderer parse it later. Behaviour must stay observably identical to
-- the C++ implementation: when you change one side, change the other. See
-- docs/lua_scripting_design.md and tests/scripting/ScriptEngine for the
-- behaviour the native side pins (units-per-em normalization, view_box
-- centring, read-only compiled templates).
--
-- Loaded as a separate chunk right after prelude.lua, so the same purity rules
-- apply: Lua 5.4 only, no I/O, no host dependencies.

---@class MtDrawingPath
local drawingPathMethods = {}
drawingPathMethods.__index = drawingPathMethods
local setDrawingPathMetatable = setmetatable
local kNormalizedPathUnitsPerEm = 1000.0

local function requireWritableDrawingPath(path)
    assert(not path.__read_only, "compiled mt.svg_path templates are read-only")
end

local function appendDrawingPathCommand(path, command, ...)
    requireWritableDrawingPath(path)
    local values = { ... }
    local fragments = {}
    if path.svg ~= "" then
        fragments[#fragments + 1] = path.svg
    end
    fragments[#fragments + 1] = command
    for valueIndex, value in ipairs(values) do
        assert(type(value) == "number" and value == value and value ~= math.huge and value ~= -math.huge,
            "path coordinates must be finite numbers")
        local sourceValue = value * path.__units_per_em / kNormalizedPathUnitsPerEm
        if path.__view_box ~= nil then
            local viewBox = path.__view_box
            local normalizationScale =
                (kNormalizedPathUnitsPerEm * path.__em_scale) / math.max(viewBox[3], viewBox[4])
            local viewBoxCenter = valueIndex % 2 == 1
                and viewBox[1] + viewBox[3] * 0.5
                or viewBox[2] + viewBox[4] * 0.5
            sourceValue = viewBoxCenter + value / normalizationScale
        end
        fragments[#fragments + 1] = tostring(sourceValue)
    end
    path.svg = table.concat(fragments, " ")
end

---@param source MtDrawingPath
function drawingPathMethods:assign(source)
    requireWritableDrawingPath(self)
    assert(type(source) == "table" and type(source.svg) == "string", "path:assign expects MtDrawingPath")
    self.svg = source.svg
    self.__units_per_em = source.__units_per_em
    self.__em_scale = source.__em_scale
    self.__view_box = source.__view_box
end

---@param source string
function drawingPathMethods:set_svg(source)
    requireWritableDrawingPath(self)
    assert(type(source) == "string", "path:set_svg expects SVG path data")
    self.svg = source
    self.__units_per_em = kNormalizedPathUnitsPerEm
    self.__em_scale = 1.0
    self.__view_box = nil
end

function drawingPathMethods:clear()
    requireWritableDrawingPath(self)
    self.svg = ""
    self.__units_per_em = kNormalizedPathUnitsPerEm
    self.__em_scale = 1.0
    self.__view_box = nil
end

---@param coordinateX number
---@param coordinateY number
function drawingPathMethods:move_to(coordinateX, coordinateY)
    appendDrawingPathCommand(self, "M", coordinateX, coordinateY)
end

---@param coordinateX number
---@param coordinateY number
function drawingPathMethods:line_to(coordinateX, coordinateY)
    appendDrawingPathCommand(self, "L", coordinateX, coordinateY)
end

---@param controlX number
---@param controlY number
---@param endX number
---@param endY number
function drawingPathMethods:quad_to(controlX, controlY, endX, endY)
    appendDrawingPathCommand(self, "Q", controlX, controlY, endX, endY)
end

---@param firstControlX number
---@param firstControlY number
---@param secondControlX number
---@param secondControlY number
---@param endX number
---@param endY number
function drawingPathMethods:cubic_to(firstControlX, firstControlY, secondControlX, secondControlY, endX, endY)
    appendDrawingPathCommand(self, "C", firstControlX, firstControlY, secondControlX, secondControlY, endX, endY)
end

function drawingPathMethods:close()
    appendDrawingPathCommand(self, "Z")
end

---@param source string
---@param readOnly boolean|nil
---@return MtDrawingPath
local function makeDrawingPath(source, readOnly, sourceOptions)
    assert(type(source) == "string", "SVG path data must be a string")
    local unitsPerEm = kNormalizedPathUnitsPerEm
    local emScale = 1.0
    local viewBox = nil
    if type(sourceOptions) == "number" then
        unitsPerEm = sourceOptions
    elseif type(sourceOptions) == "table" then
        assert(type(sourceOptions.view_box) == "table" and #sourceOptions.view_box == 4,
            "view_box must contain { min_x, min_y, width, height }")
        viewBox = {
            sourceOptions.view_box[1],
            sourceOptions.view_box[2],
            sourceOptions.view_box[3],
            sourceOptions.view_box[4],
        }
        for _, value in ipairs(viewBox) do
            assert(type(value) == "number" and value == value and value ~= math.huge and value ~= -math.huge,
                "view_box values must be finite numbers")
        end
        assert(viewBox[3] > 0.0 and viewBox[4] > 0.0,
            "view_box width and height must be finite positive numbers")
        assert(sourceOptions.units_per_em == nil,
            "units_per_em is no longer accepted here; use em_scale (1.0 = one em)")
        emScale = sourceOptions.em_scale or 1.0
        assert(type(emScale) == "number" and emScale > 0.0 and
            emScale == emScale and emScale ~= math.huge,
            "em_scale must be a finite positive number")
    else
        assert(sourceOptions == nil, "expected source units per em or an SVG path options table")
    end
    assert(type(unitsPerEm) == "number" and unitsPerEm > 0.0 and
        unitsPerEm == unitsPerEm and unitsPerEm ~= math.huge,
        "source units per em must be a finite positive number")
    return setDrawingPathMetatable({
        svg = source,
        __read_only = readOnly == true,
        __units_per_em = unitsPerEm,
        __em_scale = emScale,
        __view_box = viewBox,
    }, drawingPathMethods)
end

---Compile SVG path data into an immutable drawing-path template.
---@param source string
---@param sourceOptions number|table|nil
---@return MtDrawingPath
function mt.svg_path(source, sourceOptions)
    return makeDrawingPath(source, true, sourceOptions)
end

