-- Simulator-only companion to prelude.lua: the pure-Lua mt.svg_path /
-- MtDrawingPath implementation.
--
-- The host plugin does NOT load this file. There, mt.svg_path is implemented in
-- C++ (installPathScriptFunctions in src/scripting/ScriptPathBindings.cc) and
-- builds a real path, so this Lua version would only be dead weight — the
-- CMake prelude embedding deliberately covers prelude.lua alone.
--
-- The simulator has no native path type, so it keeps the geometry as SVG path
-- data and lets the renderer parse it later. Behaviour must stay observably identical to
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
local kMaximumAbsoluteCoordinate = 10000000.0
local kMaximumMappedPointsPerPath = 4096
local kMaximumMappedPointsPerExecution = 16384
local mappedPointsInExecution = 0

local function finitePathCoordinate(value)
    return type(value) == "number" and value == value and value ~= math.huge and
        value ~= -math.huge and math.abs(value) <= kMaximumAbsoluteCoordinate
end

local function pathNumbers(source)
    local result = {}
    for token in source:gmatch("[+-]?%d*%.?%d+[eE]?[+-]?%d*") do
        local value = tonumber(token)
        assert(value ~= nil and finitePathCoordinate(value),
            "SVG path coordinate must be finite and within +/-10000000")
        result[#result + 1] = value
    end
    return result
end

local function normalizePathPoint(path, coordinateX, coordinateY)
    if path.__view_box ~= nil then
        local viewBox = path.__view_box
        local normalizationScale =
            (kNormalizedPathUnitsPerEm * path.__em_scale) / math.max(viewBox[3], viewBox[4])
        return (coordinateX - (viewBox[1] + viewBox[3] * 0.5)) * normalizationScale,
            (coordinateY - (viewBox[2] + viewBox[4] * 0.5)) * normalizationScale
    end
    local normalizationScale = kNormalizedPathUnitsPerEm / path.__units_per_em
    return coordinateX * normalizationScale, coordinateY * normalizationScale
end

local function parseDrawingPath(path)
    assert(not path.svg:find("[Aa]"), "SVG arc commands (A/a) are not supported")
    assert(not path.svg:gsub("[eE]", ""):find("[BbDdFfGgIiJjKkNnOoPpRrUuWwXxYy]"),
        "SVG path contains an unsupported command")
    local commands = {}
    local currentX, currentY = 0.0, 0.0
    local contourX, contourY = 0.0, 0.0
    local previousQuadraticX, previousQuadraticY = 0.0, 0.0
    local previousCubicX, previousCubicY = 0.0, 0.0
    local previousCommand = nil
    local matchedCommands = 0

    local function addCommand(command, values)
        local normalized = {}
        for valueIndex = 1, #values, 2 do
            normalized[valueIndex], normalized[valueIndex + 1] =
                normalizePathPoint(path, values[valueIndex], values[valueIndex + 1])
        end
        commands[#commands + 1] = { command = command, values = normalized }
    end

    for commandToken, argumentText in path.svg:gmatch("([MmLlHhVvQqTtCcSsZz])([^MmLlHhVvQqTtCcSsZz]*)") do
        matchedCommands = matchedCommands + 1
        local values = pathNumbers(argumentText)
        local relative = commandToken:lower() == commandToken
        local command = commandToken:upper()
        local valueIndex = 1

        local function readPoint()
            assert(valueIndex + 1 <= #values, "SVG path command is missing coordinates")
            local coordinateX = values[valueIndex]
            local coordinateY = values[valueIndex + 1]
            valueIndex = valueIndex + 2
            if relative then
                coordinateX = coordinateX + currentX
                coordinateY = coordinateY + currentY
            end
            return coordinateX, coordinateY
        end

        if command == "M" then
            assert(#values >= 2 and #values % 2 == 0, "SVG move command is missing coordinates")
            local first = true
            while valueIndex <= #values do
                currentX, currentY = readPoint()
                addCommand(first and "move" or "line", { currentX, currentY })
                if first then
                    contourX, contourY = currentX, currentY
                    previousCommand = "M"
                else
                    previousCommand = "L"
                end
                first = false
            end
        elseif command == "L" then
            assert(#values >= 2 and #values % 2 == 0, "SVG line command is missing coordinates")
            while valueIndex <= #values do
                currentX, currentY = readPoint()
                addCommand("line", { currentX, currentY })
            end
            previousCommand = "L"
        elseif command == "H" then
            assert(#values >= 1, "SVG horizontal command is missing a coordinate")
            while valueIndex <= #values do
                currentX = values[valueIndex] + (relative and currentX or 0.0)
                valueIndex = valueIndex + 1
                addCommand("line", { currentX, currentY })
            end
            previousCommand = "H"
        elseif command == "V" then
            assert(#values >= 1, "SVG vertical command is missing a coordinate")
            while valueIndex <= #values do
                currentY = values[valueIndex] + (relative and currentY or 0.0)
                valueIndex = valueIndex + 1
                addCommand("line", { currentX, currentY })
            end
            previousCommand = "V"
        elseif command == "Q" then
            assert(#values >= 4 and #values % 4 == 0, "SVG quadratic command is missing coordinates")
            while valueIndex <= #values do
                local controlX, controlY = readPoint()
                local endX, endY = readPoint()
                addCommand("quad", { controlX, controlY, endX, endY })
                previousQuadraticX, previousQuadraticY = controlX, controlY
                currentX, currentY = endX, endY
            end
            previousCommand = "Q"
        elseif command == "T" then
            assert(#values >= 2 and #values % 2 == 0, "SVG smooth quadratic command is missing coordinates")
            while valueIndex <= #values do
                local controlX, controlY = currentX, currentY
                if previousCommand == "Q" or previousCommand == "T" then
                    controlX = 2.0 * currentX - previousQuadraticX
                    controlY = 2.0 * currentY - previousQuadraticY
                end
                local endX, endY = readPoint()
                addCommand("quad", { controlX, controlY, endX, endY })
                previousQuadraticX, previousQuadraticY = controlX, controlY
                currentX, currentY = endX, endY
                previousCommand = "T"
            end
        elseif command == "C" then
            assert(#values >= 6 and #values % 6 == 0, "SVG cubic command is missing coordinates")
            while valueIndex <= #values do
                local firstControlX, firstControlY = readPoint()
                local secondControlX, secondControlY = readPoint()
                local endX, endY = readPoint()
                addCommand("cubic", {
                    firstControlX, firstControlY, secondControlX, secondControlY, endX, endY,
                })
                previousCubicX, previousCubicY = secondControlX, secondControlY
                currentX, currentY = endX, endY
            end
            previousCommand = "C"
        elseif command == "S" then
            assert(#values >= 4 and #values % 4 == 0, "SVG smooth cubic command is missing coordinates")
            while valueIndex <= #values do
                local firstControlX, firstControlY = currentX, currentY
                if previousCommand == "C" or previousCommand == "S" then
                    firstControlX = 2.0 * currentX - previousCubicX
                    firstControlY = 2.0 * currentY - previousCubicY
                end
                local secondControlX, secondControlY = readPoint()
                local endX, endY = readPoint()
                addCommand("cubic", {
                    firstControlX, firstControlY, secondControlX, secondControlY, endX, endY,
                })
                previousCubicX, previousCubicY = secondControlX, secondControlY
                currentX, currentY = endX, endY
                previousCommand = "S"
            end
        elseif command == "Z" then
            assert(#values == 0, "SVG close command does not accept coordinates")
            commands[#commands + 1] = { command = "close", values = {} }
            currentX, currentY = contourX, contourY
            previousCommand = "Z"
        end
    end
    assert(path.svg:match("^%s*$") or matchedCommands > 0, "SVG path data must start with a command")
    return commands
end

local function serializeDrawingPath(path, commands)
    local fragments = {}
    local commandLetters = { move = "M", line = "L", quad = "Q", cubic = "C", close = "Z" }
    for _, command in ipairs(commands) do
        fragments[#fragments + 1] = commandLetters[command.command]
        for _, value in ipairs(command.values) do
            fragments[#fragments + 1] = tostring(value)
        end
    end
    path.svg = table.concat(fragments, " ")
    path.__units_per_em = kNormalizedPathUnitsPerEm
    path.__em_scale = 1.0
    path.__view_box = nil
end

local function requireWritableDrawingPath(path)
    assert(not path.__read_only, "compiled mt.svg_path templates are read-only")
    assert(not path.__mapping_points, "path:map_points callback cannot modify the same path")
end

local function includeBoundsPoint(bounds, coordinateX, coordinateY)
    bounds[1] = math.min(bounds[1], coordinateX)
    bounds[2] = math.min(bounds[2], coordinateY)
    bounds[3] = math.max(bounds[3], coordinateX)
    bounds[4] = math.max(bounds[4], coordinateY)
end

local function quadraticValue(startValue, controlValue, endValue, progress)
    local inverse = 1.0 - progress
    return inverse * inverse * startValue + 2.0 * inverse * progress * controlValue +
        progress * progress * endValue
end

local function cubicValue(startValue, firstControlValue, secondControlValue, endValue, progress)
    local inverse = 1.0 - progress
    return inverse * inverse * inverse * startValue +
        3.0 * inverse * inverse * progress * firstControlValue +
        3.0 * inverse * progress * progress * secondControlValue +
        progress * progress * progress * endValue
end

local function addQuadraticExtrema(progressValues, startValue, controlValue, endValue)
    local denominator = startValue - 2.0 * controlValue + endValue
    if math.abs(denominator) > 1e-12 then
        local progress = (startValue - controlValue) / denominator
        if progress > 0.0 and progress < 1.0 then
            progressValues[#progressValues + 1] = progress
        end
    end
end

local function addCubicExtrema(progressValues, startValue, firstControlValue, secondControlValue, endValue)
    local coefficientA = -startValue + 3.0 * firstControlValue - 3.0 * secondControlValue + endValue
    local coefficientB = 2.0 * (startValue - 2.0 * firstControlValue + secondControlValue)
    local coefficientC = firstControlValue - startValue
    if math.abs(coefficientA) < 1e-12 then
        if math.abs(coefficientB) > 1e-12 then
            local progress = -coefficientC / coefficientB
            if progress > 0.0 and progress < 1.0 then
                progressValues[#progressValues + 1] = progress
            end
        end
    else
        local discriminant = coefficientB * coefficientB - 4.0 * coefficientA * coefficientC
        if discriminant >= 0.0 then
            local root = math.sqrt(discriminant)
            local firstProgress = (-coefficientB + root) / (2.0 * coefficientA)
            local secondProgress = (-coefficientB - root) / (2.0 * coefficientA)
            if firstProgress > 0.0 and firstProgress < 1.0 then
                progressValues[#progressValues + 1] = firstProgress
            end
            if secondProgress > 0.0 and secondProgress < 1.0 then
                progressValues[#progressValues + 1] = secondProgress
            end
        end
    end
end

function drawingPathMethods:bounds()
    local commands = parseDrawingPath(self)
    if #commands == 0 then
        return nil
    end
    local bounds = { math.huge, math.huge, -math.huge, -math.huge }
    local currentX, currentY = 0.0, 0.0
    local contourX, contourY = 0.0, 0.0
    for _, command in ipairs(commands) do
        local values = command.values
        if command.command == "move" then
            currentX, currentY = values[1], values[2]
            contourX, contourY = currentX, currentY
            includeBoundsPoint(bounds, currentX, currentY)
        elseif command.command == "line" then
            includeBoundsPoint(bounds, currentX, currentY)
            currentX, currentY = values[1], values[2]
            includeBoundsPoint(bounds, currentX, currentY)
        elseif command.command == "quad" then
            local controlX, controlY, endX, endY = values[1], values[2], values[3], values[4]
            local progressValues = { 0.0, 1.0 }
            addQuadraticExtrema(progressValues, currentX, controlX, endX)
            addQuadraticExtrema(progressValues, currentY, controlY, endY)
            for _, progress in ipairs(progressValues) do
                includeBoundsPoint(bounds,
                    quadraticValue(currentX, controlX, endX, progress),
                    quadraticValue(currentY, controlY, endY, progress))
            end
            currentX, currentY = endX, endY
        elseif command.command == "cubic" then
            local firstControlX, firstControlY = values[1], values[2]
            local secondControlX, secondControlY = values[3], values[4]
            local endX, endY = values[5], values[6]
            local progressValues = { 0.0, 1.0 }
            addCubicExtrema(progressValues, currentX, firstControlX, secondControlX, endX)
            addCubicExtrema(progressValues, currentY, firstControlY, secondControlY, endY)
            for _, progress in ipairs(progressValues) do
                includeBoundsPoint(bounds,
                    cubicValue(currentX, firstControlX, secondControlX, endX, progress),
                    cubicValue(currentY, firstControlY, secondControlY, endY, progress))
            end
            currentX, currentY = endX, endY
        elseif command.command == "close" then
            includeBoundsPoint(bounds, currentX, currentY)
            includeBoundsPoint(bounds, contourX, contourY)
            currentX, currentY = contourX, contourY
        end
    end
    return bounds[1], bounds[2], bounds[3], bounds[4]
end

---@param callback function
function drawingPathMethods:map_points(callback)
    requireWritableDrawingPath(self)
    assert(not self.__mapping_points, "path:map_points callback cannot modify the same path")
    assert(type(callback) == "function", "path:map_points expects a callback")
    local commands = parseDrawingPath(self)
    local pointCount = 0
    for _, command in ipairs(commands) do
        pointCount = pointCount + #command.values / 2
    end
    assert(pointCount <= kMaximumMappedPointsPerPath,
        "path:map_points exceeds the maximum of 4096 points per path")
    assert(mappedPointsInExecution + pointCount <= kMaximumMappedPointsPerExecution,
        "path:map_points exceeds the maximum of 16384 points per script execution")
    mappedPointsInExecution = mappedPointsInExecution + pointCount

    local pointBacking = {}
    local pointView = setDrawingPathMetatable({}, {
        __index = pointBacking,
        __newindex = function()
            error("path point fields are read-only", 2)
        end,
    })
    local contourIndex = 0
    local pointIndex = 0
    self.__mapping_points = true
    local succeeded, callbackError = pcall(function()
        for commandIndex, command in ipairs(commands) do
            if command.command == "move" then
                contourIndex = contourIndex + 1
            end
            for valueIndex = 1, #command.values, 2 do
                pointIndex = pointIndex + 1
                pointBacking.index = pointIndex
                pointBacking.command_index = commandIndex
                pointBacking.contour_index = contourIndex
                pointBacking.command = command.command
                if command.command == "quad" then
                    pointBacking.role = valueIndex == 1 and "control1" or "anchor"
                elseif command.command == "cubic" then
                    pointBacking.role = valueIndex == 1 and "control1" or
                        (valueIndex == 3 and "control2" or "anchor")
                else
                    pointBacking.role = "anchor"
                end
                local coordinateX, coordinateY = callback(
                    command.values[valueIndex], command.values[valueIndex + 1], pointView)
                assert(finitePathCoordinate(coordinateX) and finitePathCoordinate(coordinateY),
                    "path:map_points callback must return two finite coordinates at point " .. pointIndex)
                command.values[valueIndex] = coordinateX
                command.values[valueIndex + 1] = coordinateY
            end
        end
    end)
    self.__mapping_points = false
    assert(succeeded, "path:map_points callback failed: " .. tostring(callbackError))
    serializeDrawingPath(self, commands)
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
        assert(finitePathCoordinate(value),
            "path coordinate must be finite and within +/-10000000")
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

---Create an empty mutable drawing path.
---@return MtDrawingPath
function mt.drawing_path()
    return makeDrawingPath("", false, nil)
end

function mt.__reset_path_point_budget()
    mappedPointsInExecution = 0
end
