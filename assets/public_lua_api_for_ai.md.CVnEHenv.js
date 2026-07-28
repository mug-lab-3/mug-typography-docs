import{_ as s,o as n,c as e,a2 as t}from"./chunks/framework.CkaEw-3u.js";const u=JSON.parse('{"title":"","description":"","frontmatter":{"head":[["link",{"rel":"canonical","href":"https://mug-lab-3.github.io/mug-typography-docs/public/lua_api_for_ai.html"}],["meta",{"property":"og:type","content":"website"}],["meta",{"property":"og:site_name","content":"Mug Typography Manual"}],["meta",{"property":"og:locale","content":"ja_JP"}],["meta",{"property":"og:title","content":" | Mug Typography Manual"}],["meta",{"property":"og:description","content":"文字をパーツまで分解して動かせる、DaVinci Resolve対応OFXプラグイン Mug Typography のオンラインマニュアル"}],["meta",{"property":"og:url","content":"https://mug-lab-3.github.io/mug-typography-docs/public/lua_api_for_ai.html"}],["meta",{"property":"og:image","content":"https://mug-lab-3.github.io/mug-typography-docs/image/social-card.png"}],["meta",{"property":"og:image:type","content":"image/png"}],["meta",{"property":"og:image:width","content":"1200"}],["meta",{"property":"og:image:height","content":"630"}],["meta",{"property":"og:image:alt","content":"Mug Typography Online Manual"}],["meta",{"name":"twitter:card","content":"summary_large_image"}],["meta",{"name":"twitter:site","content":"@MugLab3"}],["meta",{"name":"twitter:title","content":" | Mug Typography Manual"}],["meta",{"name":"twitter:description","content":"文字をパーツまで分解して動かせる、DaVinci Resolve対応OFXプラグイン Mug Typography のオンラインマニュアル"}],["meta",{"name":"twitter:image","content":"https://mug-lab-3.github.io/mug-typography-docs/image/social-card.png"}],["meta",{"name":"twitter:image:alt","content":"Mug Typography Online Manual"}]]},"headers":[],"relativePath":"public/lua_api_for_ai.md","filePath":"public/lua_api_for_ai.md"}'),i={name:"public/lua_api_for_ai.md"};function p(l,a,o,r,c,h){return n(),e("div",null,[...a[0]||(a[0]=[t(`<p>Lua 5.4 for the Mug Typography plugin. Complete contract for <code>ctx</code>: every field, unit, direction, reference point. Read section 1 first — most failures are units, direction or reference point, not syntax.</p><h2 id="_0-not-in-this-file" tabindex="-1">0. Not in this file <a class="header-anchor" href="#_0-not-in-this-file" aria-label="Permalink to &quot;0. Not in this file&quot;">​</a></h2><p>Complete for <code>ctx</code>. Incomplete for <code>mt.*</code> — the listing gives names, argument names, one-line purpose. Missing: argument types and units (whether a <code>delay</code> is seconds or frames); default values of <code>?</code> arguments; permitted string values (a <code>pattern</code> argument&#39;s <code>&quot;asc&quot;</code>/<code>&quot;desc&quot;</code>/<code>&quot;center&quot;</code>/<code>&quot;random&quot;</code>); error conditions (that <code>duration &lt;= 0</code> raises); table argument shapes (<code>keys</code> in <code>mt.keyframes</code>).</p><p>Required behaviour: if the requested script depends on any of those and <code>03_mt_reference.md</code> is not in your context, <strong>stop and ask the user to attach <code>03_mt_reference.md</code></strong>, naming the function you need it for. It ships in the plugin&#39;s distribution ZIP at <code>scripting-simulator/docs/en/03_mt_reference.md</code> (<code>docs/ja/</code> for Japanese). Do not guess. Do not swap in another function to avoid asking. Guessed enum values and units are the most common failure.</p><p>Proceed without it only when the call uses required arguments whose meaning is unambiguous from the name (<code>mt.lerp(from, to, t)</code>, <code>mt.saturate(value)</code>).</p><h3 id="the-companion-documents" tabindex="-1">The companion documents <a class="header-anchor" href="#the-companion-documents" aria-label="Permalink to &quot;The companion documents&quot;">​</a></h3><p>Treat this file as the entry point and index. Below is what each companion contains and how to use it. If you need one that is not in your context, ask the user for it <strong>by filename</strong>.</p><p>Only <code>03_mt_reference.md</code> carries facts this file lacks. <code>01_concepts.md</code> and <code>04_appendix.md</code> are longer explanations of material already condensed here — you do not need them to write correct code.</p><p><code>03_mt_reference.md</code> — has: an &quot;Index by Purpose&quot; table at the top, then a per-function <code>### </code> heading with Arguments table (Argument/Type/Unit/Default, Default = <code>Required</code> or the value), Return Value table, Constraints and Errors table. Use: when you know the function, jump to its <code>### </code> heading and read the Arguments table; when you only know the goal, start from Index by Purpose. Do not read the file end to end.</p><p><code>02_ctx_reference.md</code> — has: prose on <code>ctx</code> field semantics; deeper on write-on, part ordering, geometry, timeline, path selection. Use: when a field&#39;s one-line description leaves the semantics unclear. Units/directions here still win.</p><p><code>01_concepts.md</code> — has: long-form sections 1-7 and 9 of this file. Adds nothing that changes code. Use: only to explain <strong>why</strong> a rule holds.</p><p><code>04_appendix.md</code> — has: long-form section 10 plus the gradient reference-line vector math. Use: only for that derivation.</p><p><code>api-schema.json</code> — has: this file&#39;s tables as machine-readable data. Use: only to enumerate fields programmatically.</p><p><code>samples/reference/</code> (one concept each), <code>samples/showcase/</code> (complete effects) — Use: imitate a nearby sample&#39;s structure instead of inventing a style.</p><p>Precedence: this file wins on units, directions, reference points, read/write phases. <code>03_mt_reference.md</code> wins on <code>mt.*</code> argument details. Fact in none of them: say so, do not invent.</p><h2 id="_1-the-five-rules-that-break-most-scripts" tabindex="-1">1. The five rules that break most scripts <a class="header-anchor" href="#_1-the-five-rules-that-break-most-scripts" aria-label="Permalink to &quot;1. The five rules that break most scripts&quot;">​</a></h2><p><strong>1. <code>ctx</code> is rebuilt from Inspector values every frame. Accumulation does not work.</strong></p><div class="language-lua vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">lua</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">ctx.</span><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">global</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">.</span><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">rotation</span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;"> =</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> ctx.</span><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">global</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">.</span><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">rotation</span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;"> +</span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;"> 1.0</span><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">   -- WRONG: always Inspector + 1</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">ctx.</span><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">global</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">.</span><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">rotation</span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;"> =</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> ctx.</span><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">time</span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;"> *</span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;"> 20.0</span><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">             -- RIGHT: derived from time</span></span></code></pre></div><p>Every frame must be computable from <code>ctx.time</code> alone. The host evaluates frames out of order (scrubbing, reverse playback, cache, parallel render), so never carry state between frames.</p><p><strong>2. Offsets and pivots are displacements with neutral <code>0.5</code>, not positions.</strong></p><p><code>0.5</code> means &quot;no displacement&quot;. <code>0.0</code> is not the origin — it is a displacement of <code>-0.5</code> canvas widths/heights.</p><div class="language-lua vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">lua</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">character.</span><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">offset_y</span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;"> =</span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;"> 0.0</span><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">    -- WRONG if you meant &quot;no offset&quot;: shifts down half a canvas</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">character.</span><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">offset_y</span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;"> =</span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;"> 0.5</span><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">    -- RIGHT: no displacement</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">character.</span><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">offset_y</span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;"> =</span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;"> 0.5</span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;"> +</span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;"> 0.1</span><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">   -- RIGHT: 10% of canvas height upward</span></span></code></pre></div><p>Only <code>global.position_*</code>, <code>camera.target_*</code> and the <code>geometry.*</code> canvas coordinates are absolute positions where <code>0.5</code> is the canvas center.</p><p><strong>3. Y is up, but rotation is clockwise-positive.</strong> The two conventions disagree on purpose: positions follow math (Y up), angles follow screen intuition.</p><ul><li><code>offset_y</code>, <code>position_y</code> larger → moves <strong>up</strong></li><li><code>rotation</code>, <code>gradient.angle</code>, <code>shadow.angle</code> positive → rotates <strong>clockwise</strong></li><li><code>shadow.angle = 90</code> points <strong>straight down</strong>, not up</li><li><code>z</code> positive → <strong>away</strong> from the camera (deeper)</li></ul><p>To turn an angle into an offset vector, use <code>mt.polar_offset_2d</code>, which converts between the two conventions for you:</p><div class="language-lua vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">lua</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">local</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> dx, dy </span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">=</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> mt.</span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;">polar_offset_2d</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">(angle, radius)</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">character.</span><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">offset_x</span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;"> =</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> character.</span><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">offset_x</span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;"> +</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> dx</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">character.</span><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">offset_y</span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;"> =</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> character.</span><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">offset_y</span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;"> +</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> dy</span></span></code></pre></div><p><strong>4. Percentages have different bases. <code>shadow.distance</code> is the trap.</strong></p><p><code>shadow.distance</code> is a percentage of the canvas <strong>short side</strong> (<code>1.0</code> = 1%), while <code>bounding_box.*</code> lengths are percentages of <strong>font size</strong> (<code>100.0</code> = one font size; px = <code>value * fontSizePx / 100</code>). Writing a canvas-ratio-looking value makes the shadow invisible:</p><div class="language-lua vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">lua</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">ctx.</span><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">global</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">.</span><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">shadow</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">.</span><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">distance</span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;"> =</span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;"> 0.02</span><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">   -- WRONG: 0.02% of short side, sub-pixel, invisible</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">ctx.</span><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">global</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">.</span><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">shadow</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">.</span><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">distance</span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;"> =</span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;"> 1.2</span><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">    -- RIGHT: 1.2% of short side (useful range 0.8-2.0)</span></span></code></pre></div><p><strong>5. An error anywhere in a callback discards every change that callback made.</strong> There is no partial application. A failed <code>OnPreLayout</code> also skips <code>OnLayout</code> and <code>OnPath</code>.</p><h2 id="_2-callbacks" tabindex="-1">2. Callbacks <a class="header-anchor" href="#_2-callbacks" aria-label="Permalink to &quot;2. Callbacks&quot;">​</a></h2><p>All four are optional. Undefined callbacks are skipped.</p><div class="language-text vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">text</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>Script load</span></span>
<span class="line"><span>  └─ OnInitialize(ctx)      once, legacy only — do not define in new scripts</span></span>
<span class="line"><span></span></span>
<span class="line"><span>Every frame</span></span>
<span class="line"><span>  └─ OnPreLayout(ctx)       before layout is generated</span></span>
<span class="line"><span>       ↓  layout generation (character and part counts become final)</span></span>
<span class="line"><span>     OnLayout(ctx)          adjust generated characters and parts</span></span>
<span class="line"><span>       ↓</span></span>
<span class="line"><span>     OnPath(ctx)            replace or rebuild part outlines</span></span>
<span class="line"><span>       ↓  render</span></span></code></pre></div><table tabindex="0"><thead><tr><th>Callback</th><th>Writable targets</th><th>On error</th></tr></thead><tbody><tr><td><code>OnInitialize(ctx)</code></td><td><code>mt.storage</code> (deprecated). Only <code>ctx.canvas</code> / <code>ctx.fonts</code> / <code>ctx.meta</code> readable</td><td>Frame evaluation does not start</td></tr><tr><td><code>OnPreLayout(ctx)</code></td><td><code>ctx.global</code>, <code>ctx.camera</code></td><td>Host values are used; <code>OnLayout</code> / <code>OnPath</code> skipped</td></tr><tr><td><code>OnLayout(ctx)</code></td><td><code>ctx.chars[i]</code>, <code>ctx.parts[i]</code>, <code>ctx.bounding_box</code>, <code>ctx.output</code></td><td>Unmodified layout is rendered</td></tr><tr><td><code>OnPath(ctx)</code></td><td><code>path</code> of parts obtained from <code>ctx.paths</code></td><td>Original glyph outlines are rendered</td></tr></tbody></table><p>Later callbacks can read what earlier ones finalized, but cannot write back: <code>ctx.global</code> and <code>ctx.camera</code> are readable in <code>OnLayout</code> and read-only there. The per-field <code>[R:... W:...]</code> markers in the <code>ctx</code> reference are authoritative.</p><p>Iterate with <code>ctx.char_count</code> / <code>ctx.part_count</code>; both are 1-based. Never assume a fixed character count, part count or glyph shape.</p><h2 id="_3-units" tabindex="-1">3. Units <a class="header-anchor" href="#_3-units" aria-label="Permalink to &quot;3. Units&quot;">​</a></h2><p>Every numeric field in the <code>ctx</code> reference carries <code>unit=</code>, and where meaningful <code>neutral=</code>, <code>+Y=</code> and <code>base=</code>. The unit vocabulary:</p><table tabindex="0"><thead><tr><th>Unit</th><th>Meaning</th></tr></thead><tbody><tr><td><code>canvas_ratio_position</code></td><td>Absolute canvas position. <code>0.5</code> = canvas center. X uses canvas width, Y uses canvas height</td></tr><tr><td><code>canvas_ratio_displacement</code></td><td>Displacement from a reference point. <code>0.5</code> = zero displacement</td></tr><tr><td><code>canvas_ratio_length</code></td><td>Length or relative offset as a canvas fraction. No <code>0.5</code> neutral</td></tr><tr><td><code>canvas_short_side_percent</code></td><td>Percent of <code>min(width, height)</code>. <code>1.0</code> = 1%</td></tr><tr><td><code>font_size_percent</code></td><td>Percent of font size. <code>100.0</code> = one font size</td></tr><tr><td><code>em</code></td><td>Ratio to font size. <code>1.0</code> = 1 em</td></tr><tr><td><code>multiplier</code></td><td><code>1.0</code> = unchanged</td></tr><tr><td><code>unit_interval</code></td><td><code>0.0</code>–<code>1.0</code></td></tr><tr><td><code>degrees</code></td><td>Angle, clockwise-positive for 2D</td></tr><tr><td><code>px</code>, <code>seconds</code>, <code>frames</code>, <code>fps</code></td><td>Literal units</td></tr><tr><td><code>font_design_units</code>, <code>path_units</code></td><td>Font/path coordinate space</td></tr><tr><td><code>perspective_strength</code>, <code>gradient_position</code>, <code>ratio</code></td><td>See the field&#39;s <code>base=</code></td></tr></tbody></table><p>Position vs. displacement, side by side:</p><table tabindex="0"><thead><tr><th>Kind</th><th>Fields</th><th><code>0.5</code> means</th></tr></thead><tbody><tr><td>Position</td><td><code>global.position_*</code>, <code>camera.target_*</code>, <code>geometry.*</code> canvas coords</td><td>canvas center</td></tr><tr><td>Displacement</td><td><code>global.pivot_*</code>, character/part <code>offset_*</code> and <code>pivot_*</code></td><td>zero displacement</td></tr></tbody></table><h3 id="pivot-reference-points" tabindex="-1">Pivot reference points <a class="header-anchor" href="#pivot-reference-points" aria-label="Permalink to &quot;Pivot reference points&quot;">​</a></h3><p><code>pivot</code> is measured from the item&#39;s own reference point, so never assign a <code>geometry</code> canvas coordinate to a pivot.</p><ul><li><code>global.pivot_*</code> — from <code>global.position</code></li><li><code>character.pivot_*</code> — from the character&#39;s natural bounds center (<code>geometry.bounds_center_*</code>)</li><li><code>part.pivot_*</code> — from the part&#39;s natural position (<code>geometry.canvas_center_*</code>)</li></ul><p>To rotate a character around one of its edges, displace by half its size (<code>bounds_width</code> / <code>bounds_height</code> are canvas-axis ratios, the same unit as pivot displacement):</p><div class="language-lua vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">lua</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">character.</span><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">pivot_y</span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;"> =</span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;"> 0.5</span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;"> -</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> geometry.</span><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">bounds_height</span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;"> *</span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;"> 0.5</span><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">   -- bottom edge</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">character.</span><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">pivot_y</span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;"> =</span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;"> 0.5</span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;"> +</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> geometry.</span><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">bounds_height</span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;"> *</span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;"> 0.5</span><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">   -- top edge</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">character.</span><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">pivot_x</span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;"> =</span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;"> 0.5</span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;"> -</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> geometry.</span><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">bounds_width</span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">  *</span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;"> 0.5</span><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">   -- left edge</span></span></code></pre></div><h3 id="angles-in-detail" tabindex="-1">Angles in detail <a class="header-anchor" href="#angles-in-detail" aria-label="Permalink to &quot;Angles in detail&quot;">​</a></h3><ul><li><strong>2D <code>rotation</code></strong> — positive is clockwise.</li><li><strong>Object <code>yaw</code> / <code>pitch</code></strong> (global, character, part) — rotate about the item&#39;s own pivot. <code>yaw</code> positive turns the right edge toward the viewer (<code>-Z</code>); <code>pitch</code> positive turns the top edge toward the viewer.</li><li><strong>Camera <code>yaw</code> / <code>pitch</code></strong> — orbit the look-at target. <code>yaw</code> positive moves the camera to the <strong>right</strong> of the target, so the subject appears to turn left. <code>pitch</code> positive moves the camera <strong>up</strong>, looking down at the subject.</li><li><strong><code>gradient.angle</code></strong> — <code>0</code> runs left to right (<code>+X</code>), increasing is clockwise.</li><li><strong><code>shadow.angle</code></strong> — <code>0</code> casts right (<code>+X</code>), increasing is clockwise, <code>90</code> is straight down.</li></ul><h3 id="aspect-ratio" tabindex="-1">Aspect ratio <a class="header-anchor" href="#aspect-ratio" aria-label="Permalink to &quot;Aspect ratio&quot;">​</a></h3><p>For circular or radial effects use <code>mt.layout.radial_distance(ctx, x, y)</code>, which corrects for canvas aspect internally. For a manual directional calculation, multiply the X difference by <code>ctx.canvas.aspect_ratio</code> first (and by <code>ctx.canvas.pixel_aspect_ratio</code> for non-square pixels).</p><h2 id="_4-colors" tabindex="-1">4. Colors <a class="header-anchor" href="#_4-colors" aria-label="Permalink to &quot;4. Colors&quot;">​</a></h2><p>A color is <code>{ r = 1.0, g = 0.5, b = 0.0, a = 1.0 }</code>, each component <code>0.0</code>–<code>1.0</code>. Partial assignment is allowed and merges with the current value; unknown keys raise an error.</p><div class="language-lua vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">lua</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">character.</span><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">fill</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">.</span><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">color</span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;"> =</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> { a </span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">=</span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;"> 0.5</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> }        </span><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">-- keeps r/g/b, changes alpha only</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">character.</span><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">fill</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">.</span><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">color</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">.</span><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">a</span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;"> =</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> character.</span><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">fill</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">.</span><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">color</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">.</span><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">a</span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;"> *</span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;"> 0.5</span></span></code></pre></div><h2 id="_5-inheritance" tabindex="-1">5. Inheritance <a class="header-anchor" href="#_5-inheritance" aria-label="Permalink to &quot;5. Inheritance&quot;">​</a></h2><p><code>use</code> selects <em>which</em> value is used; it does not toggle visibility.</p><div class="language-text vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">text</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>Global finalized in OnPreLayout</span></span>
<span class="line"><span>  ↓  character: fill/stroke/shadow use == true ? character value : global value</span></span>
<span class="line"><span>  ↓  part:      fill/stroke/shadow use == true ? part value      : value chosen above</span></span></code></pre></div><p>Then opacity multiplies: <code>global.opacity * character.opacity * part.opacity</code>.</p><p>Setting an individual color has no effect while <code>use</code> is <code>false</code> — set both in the same callback:</p><div class="language-lua vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">lua</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">character.</span><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">fill</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">.</span><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">use</span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;"> =</span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;"> true</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">character.</span><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">fill</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">.</span><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">color</span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;"> =</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> mt.</span><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">color</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">.</span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;">from_hsv</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">(index </span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">/</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> ctx.</span><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">char_count</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">, </span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;">0.8</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">, </span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;">1.0</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">)</span></span></code></pre></div><p>A gradient (<code>gradient.color_space ~= &quot;none&quot;</code>) fills only the regions that resolved to the global value, i.e. where both character and part <code>fill.use</code> are <code>false</code>. <code>global.fill.transparent</code> affects the fill only, not stroke or shadow.</p><p>A part&#39;s <code>stroke</code> / <code>shadow</code> resolves in the same order as <code>fill</code>, except that the host has no part-level parameter group for them: they always start unused, with default values. Set them from the script if you want them.</p><p>Transform fields (offset, scale, rotation, …) have no <code>use</code> flag and always apply.</p><p>Assigning a whole table to a subobject merges per field; omitted fields keep their current values.</p><div class="language-lua vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">lua</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">ctx.</span><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">global</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">.</span><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">shadow</span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;"> =</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> { enabled </span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">=</span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;"> true</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">, distance </span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">=</span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;"> 1.2</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> }   </span><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">-- other shadow fields unchanged</span></span></code></pre></div><h2 id="_6-syntax-that-the-field-tables-cannot-show" tabindex="-1">6. Syntax that the field tables cannot show <a class="header-anchor" href="#_6-syntax-that-the-field-tables-cannot-show" aria-label="Permalink to &quot;6. Syntax that the field tables cannot show&quot;">​</a></h2><h3 id="methods-are-called-with-a-colon" tabindex="-1">Methods are called with a colon <a class="header-anchor" href="#methods-are-called-with-a-colon" aria-label="Permalink to &quot;Methods are called with a colon&quot;">​</a></h3><p><code>ctx.paths</code> and <code>path</code> members are <strong>methods</strong>. Calling them with a dot fails.</p><div class="language-lua vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">lua</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">local</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> parts </span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">=</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> ctx.</span><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">paths</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">:</span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;">select</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">(</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">&quot;c1, p8-10, !p9&quot;</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">)   </span><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">-- RIGHT</span></span>
<span class="line"><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">local</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> parts </span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">=</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> ctx.</span><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">paths</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">.</span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;">select</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">(</span><span style="--shiki-light:#032F62;--shiki-dark:#9ECBFF;">&quot;c1&quot;</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">)               </span><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">-- WRONG</span></span>
<span class="line"><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">path</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">:</span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;">move_to</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">(</span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;">0</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">, </span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;">0</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">)                                 </span><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">-- RIGHT</span></span></code></pre></div><h3 id="part-selector-grammar" tabindex="-1">Part selector grammar <a class="header-anchor" href="#part-selector-grammar" aria-label="Permalink to &quot;Part selector grammar&quot;">​</a></h3><p>Used by <code>ctx.paths:select(selector)</code>. <code>c</code> = character number, <code>p</code> = global part number, <code>!</code> = exclude, comma separates conditions, ranges like <code>c3-5</code> / <code>p8-10</code> are supported. Retrieving the same part twice returns the same mutable object within a frame.</p><h3 id="path-coordinates-are-y-down" tabindex="-1">Path coordinates are Y-DOWN <a class="header-anchor" href="#path-coordinates-are-y-down" aria-label="Permalink to &quot;Path coordinates are Y-DOWN&quot;">​</a></h3><p>This is the one place the API inverts. Path-editing coordinates are <strong>Y-down</strong>, part-center origin, 1000 units = 1 em, independent of canvas resolution — unlike every other Y in this API, which is Y-up.</p><p><code>ctx.paths</code> is rebuilt every frame, so apply path edits every frame; parts left untouched keep their original glyph outline.</p><h3 id="ctx-global-margins" tabindex="-1"><code>ctx.global.margins</code> <a class="header-anchor" href="#ctx-global-margins" aria-label="Permalink to &quot;\`ctx.global.margins\`&quot;">​</a></h3><p>A 1-based dense array, keyed by the same index as <code>ctx.chars</code>. <code>margins[i]</code> is added in em units together with <code>tracking</code> to the advance <strong>after</strong> character i. Non-integer keys, string keys, holes, and non-number elements raise an error. A shorter dense array than the default (<code>ctx.meta.limits.max_characters</code>) is allowed; surplus elements are simply unused.</p><p><code>ctx.char_count</code> is undefined in <code>OnPreLayout</code>, and <code>utf8.len(ctx.global.text)</code> may differ from the shaped character count (combining marks, ligatures, grapheme clusters). Do exact-count work in <code>OnLayout</code>.</p><h3 id="ctx-output-manual-order-text" tabindex="-1"><code>ctx.output.manual_order_text</code> <a class="header-anchor" href="#ctx-output-manual-order-text" aria-label="Permalink to &quot;\`ctx.output.manual_order_text\`&quot;">​</a></h3><p>Tokens separated by commas or spaces; invalid tokens are ignored, and a part specified twice uses only its first occurrence.</p><table tabindex="0"><thead><tr><th>Token</th><th>Meaning</th></tr></thead><tbody><tr><td><code>c&lt;n&gt;</code></td><td>1-based character n; expands to all its parts in the current part order</td></tr><tr><td><code>p&lt;n&gt;</code></td><td>1-based global part n</td></tr><tr><td><code>&lt;n&gt;</code></td><td>No prefix; interpreted as a part index</td></tr><tr><td><code>&lt;a&gt;-&lt;b&gt;</code></td><td>Inclusive range, both endpoints the same type; expands ascending</td></tr></tbody></table><p>Listed elements move to the front in the given order. <strong>Unlisted parts are not hidden</strong> — they follow, keeping their relative base order. The order is computed from the undeformed layout, not recomputed from animated positions. <code>write_on_start</code> / <code>write_on_end</code> control visibility; manual order controls only order.</p><h2 id="_7-execution-environment" tabindex="-1">7. Execution environment <a class="header-anchor" href="#_7-execution-environment" aria-label="Permalink to &quot;7. Execution environment&quot;">​</a></h2><ul><li>Available: <code>math</code>, <code>string</code>, <code>table</code>, <code>utf8</code>, safe base functions.</li><li>Unavailable: <code>os</code>, <code>io</code>, <code>package</code>, <code>require</code>, <code>dofile</code>, <code>loadfile</code>, <code>load</code>, <code>debug</code>, <code>collectgarbage</code>, <code>rawget</code>, <code>rawset</code>, <code>getmetatable</code>, <code>setmetatable</code>. No file, network or process access.</li><li>Limits: 5,000,000 instructions per callback invocation; 128 MiB memory. Exceeding either is treated as an error (section 1, rule 5).</li><li><code>print(...)</code> writes to the simulator Output panel and is ignored by the host.</li><li>Errors that raise: writing a non-writable field, adding an unknown field, type mismatch, replacing or resizing <code>ctx.chars</code> / <code>ctx.parts</code>, assigning an invalid string to an enumerated field.</li></ul><h2 id="_8-reference-example" tabindex="-1">8. Reference example <a class="header-anchor" href="#_8-reference-example" aria-label="Permalink to &quot;8. Reference example&quot;">​</a></h2><div class="language-lua vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">lua</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">function</span><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;"> OnPreLayout</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">(ctx)</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">    ctx.</span><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">global</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">.</span><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">tracking</span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;"> =</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> mt.</span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;">wave</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">(ctx.</span><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">time</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">, </span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;">0.25</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">, </span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;">0.0</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">) </span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">*</span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;"> 0.05</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">    ctx.</span><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">global</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">.</span><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">rotation</span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;"> =</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> mt.</span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;">wave</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">(ctx.</span><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">time</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">, </span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;">0.1</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">, </span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;">0.0</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">) </span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">*</span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;"> 5.0</span></span>
<span class="line"><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">end</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">function</span><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;"> OnLayout</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">(ctx)</span></span>
<span class="line"><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">    for</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> index </span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">=</span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;"> 1</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">, ctx.</span><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">char_count</span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;"> do</span></span>
<span class="line"><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">        local</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> character </span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">=</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> ctx.</span><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">chars</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">[index]</span></span>
<span class="line"><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">        local</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> progress </span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">=</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> mt.</span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;">stagger</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">(ctx.</span><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">time</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">, index, </span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;">0.06</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">, </span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;">0.35</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">)</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">        character.</span><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">offset_y</span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;"> =</span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;"> 0.5</span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;"> +</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> (</span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;">1.0</span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;"> -</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> mt.</span><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">ease</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">.</span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;">out_cubic</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">(progress)) </span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">*</span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;"> 0.15</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">        character.</span><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">rotation</span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;"> =</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> character.</span><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">rotation</span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;"> +</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> mt.</span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;">wave</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">(ctx.</span><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">time</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">, </span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;">0.5</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">, index </span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">*</span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;"> 0.25</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">) </span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">*</span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;"> 3.0</span></span>
<span class="line"><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">    end</span></span>
<span class="line"><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">end</span></span></code></pre></div><h2 id="_9-script-metadata-header" tabindex="-1">9. Script metadata header <a class="header-anchor" href="#_9-script-metadata-header" aria-label="Permalink to &quot;9. Script metadata header&quot;">​</a></h2><p>Leading Lua comments configure the simulator. They are not part of the runtime API. <code>@MugTypography</code> must appear within the first 5 lines for the script to be recognised (<code>@mt</code> / <code>@mug</code> also work).</p><div class="language-lua vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">lua</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">-- @MugTypography</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">-- @duration 5.0           -- initial preview length in seconds</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">-- @required 3d            -- force &quot;Enable 3D projection&quot; on</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">-- @title Falling Letters</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">-- @</span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">author</span><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;"> Mug</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">-- @version 1.0</span></span>
<span class="line"><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">-- @api_level 5</span></span></code></pre></div><p><code>@recommend</code> sets initial Inspector values. Use it <strong>only</strong> when the effect needs specific conditions; do not pin text, position or background otherwise, because it becomes unclear whether an on-screen result came from the script or the preset.</p><table tabindex="0"><thead><tr><th>Directive</th><th>Meaning</th></tr></thead><tbody><tr><td><code>@recommend bg &lt;spec&gt;</code></td><td><code>#RRGGBB</code> / <code>#RRGGBBAA</code>, or <code>checkerboard</code> / <code>checker</code>. Both may appear on one line</td></tr><tr><td><code>@recommend pos &lt;X&gt; &lt;Y&gt;</code></td><td>Global position; larger X is right, larger Y is up. Center is <code>0.5 0.5</code></td></tr><tr><td><code>@recommend text &quot;&lt;string&gt;&quot;</code></td><td>Quoted; <code>\\n</code> is a newline</td></tr><tr><td><code>@recommend lang &lt;code&gt;</code></td><td>Picks a font for that language, e.g. <code>ja</code>. Inferred from <code>text</code> when omitted</td></tr></tbody></table><h2 id="_10-recipes-for-three-problems-that-are-easy-to-get-wrong" tabindex="-1">10. Recipes for three problems that are easy to get wrong <a class="header-anchor" href="#_10-recipes-for-three-problems-that-are-easy-to-get-wrong" aria-label="Permalink to &quot;10. Recipes for three problems that are easy to get wrong&quot;">​</a></h2><p><strong>Advance after per-character scale.</strong> Changing <code>scale</code> does not change the advance, so scaled characters overlap or leave gaps. Call <code>mt.layout.reflow(ctx)</code> after writing the scales.</p><div class="language-lua vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">lua</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">function</span><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;"> OnLayout</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">(ctx)</span></span>
<span class="line"><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">    for</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> index </span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">=</span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;"> 1</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">, ctx.</span><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">char_count</span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;"> do</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">        ctx.</span><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">chars</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">[index].</span><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">scale</span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;"> =</span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;"> 0.8</span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;"> +</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> index </span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">*</span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;"> 0.05</span></span>
<span class="line"><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">    end</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">    mt.</span><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">layout</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">.</span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;">reflow</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">(ctx)   </span><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">-- recompute advances for the new sizes</span></span>
<span class="line"><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">end</span></span></code></pre></div><p><strong>Gradient range.</strong> <code>start_position</code> / <code>end_position</code> are <strong>not</strong> canvas coordinates. They are ratios along the <code>angle</code> direction across the bounding box of the whole text <em>after</em> transforms. <code>0.0</code>/<code>1.0</code> spans edge to edge; <code>0.2</code>/<code>0.8</code> starts 20% inward from each edge. <code>angle = 0</code> is left-to-right, <code>90</code> is top-to-bottom, <code>-90</code> (or <code>270</code>) is bottom-to-top. The fill color sits at the <code>start_position</code> end and <code>end_color</code> at the <code>end_position</code> end. Under 3D the box is measured on the layout plane, so camera moves do not shift the gradient.</p><p><strong>Passing values between callbacks.</strong> A file-scope <code>local</code> may carry a value from <code>OnPreLayout</code> to <code>OnLayout</code> <strong>within the same frame</strong> only, and must be overwritten from current inputs every frame — never accumulated across frames (section 1, rule 1).</p><div class="language-lua vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">lua</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">local</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> scaleKnob </span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">=</span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;"> 1.0</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">function</span><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;"> OnPreLayout</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">(ctx)</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">    scaleKnob </span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">=</span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;"> math.max</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">(ctx.</span><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">global</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">.</span><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">scale</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">, </span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;">0.05</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">)   </span><span style="--shiki-light:#6A737D;--shiki-dark:#6A737D;">-- overwritten every frame</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">    ctx.</span><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">global</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">.</span><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">scale</span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;"> =</span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;"> 1.0</span></span>
<span class="line"><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">end</span></span>
<span class="line"></span>
<span class="line"><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">function</span><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;"> OnLayout</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">(ctx)</span></span>
<span class="line"><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">    local</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> travel </span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">=</span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;"> 0.07</span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;"> *</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> scaleKnob</span></span>
<span class="line"><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">    for</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> index </span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">=</span><span style="--shiki-light:#005CC5;--shiki-dark:#79B8FF;"> 1</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">, ctx.</span><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">char_count</span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;"> do</span></span>
<span class="line"><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">        ctx.</span><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">chars</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">[index].</span><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">offset_y</span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;"> =</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> ctx.</span><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">chars</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;">[index].</span><span style="--shiki-light:#6F42C1;--shiki-dark:#B392F0;">offset_y</span><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;"> +</span><span style="--shiki-light:#24292E;--shiki-dark:#E1E4E8;"> travel</span></span>
<span class="line"><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">    end</span></span>
<span class="line"><span style="--shiki-light:#D73A49;--shiki-dark:#F97583;">end</span></span></code></pre></div><h2 id="_11-checklist-before-returning-a-script" tabindex="-1">11. Checklist before returning a script <a class="header-anchor" href="#_11-checklist-before-returning-a-script" aria-label="Permalink to &quot;11. Checklist before returning a script&quot;">​</a></h2><p>Verify each item against the field tables below. These are the failures seen most often in generated scripts.</p><ol><li>Every animated value derives from <code>ctx.time</code> — no accumulation, no state kept between frames, no reliance on evaluation order.</li><li>Every field you wrote is writable <strong>in the callback you wrote it in</strong> (check its <code>W:</code> phases). Writing <code>ctx.global</code> from <code>OnLayout</code> is an error, not a silent no-op.</li><li>Every <code>offset_*</code> and <code>pivot_*</code> is written as <code>0.5 ± delta</code>, never as a bare magnitude, and never assigned a <code>geometry</code> canvas coordinate.</li><li>Angles use the clockwise-positive convention; a downward shadow is <code>angle = 90</code>. Direction vectors built from an angle go through <code>mt.polar_offset_2d</code>.</li><li><code>shadow.distance</code> is a short-side percentage, not a canvas fraction — a visible shadow is normally around 0.8–2.0, not 0.0x.</li><li>Loops use <code>ctx.char_count</code> / <code>ctx.part_count</code> and are 1-based.</li><li>Individual colors are paired with <code>use = true</code>.</li><li><code>ctx.paths</code> and <code>path</code> members are called with a colon.</li><li>No <code>mt.*</code> call relies on a guessed default, string value, or table shape (section 0).</li></ol><p>State any assumption you had to make, and name any documentation you needed but were not given.</p><h2 id="_12-ctx-reference" tabindex="-1">12. ctx reference <a class="header-anchor" href="#_12-ctx-reference" aria-label="Permalink to &quot;12. ctx reference&quot;">​</a></h2><p>Format: <code>path : type [R:readable phases W:writable phases]</code>, then unit metadata, then description. Phases are <code>init</code> / <code>pre</code> / <code>layout</code> / <code>path</code>. Indices are 1-based.</p><h3 id="ctx" tabindex="-1">ctx <a class="header-anchor" href="#ctx" aria-label="Permalink to &quot;ctx&quot;">​</a></h3><div class="language-text vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">text</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>ctx.time : number [R:pre,layout,path read-only]</span></span>
<span class="line"><span>    unit=seconds</span></span>
<span class="line"><span>    Current clip-local time in seconds (0 at the clip head).</span></span>
<span class="line"><span>ctx.frame : number [R:pre,layout,path read-only]</span></span>
<span class="line"><span>    unit=frames</span></span>
<span class="line"><span>    Current clip-local frame number (0 at the clip head). May include subframes.</span></span>
<span class="line"><span>ctx.fps : number [R:pre,layout,path read-only]</span></span>
<span class="line"><span>    unit=fps</span></span>
<span class="line"><span>    Frames per second.</span></span>
<span class="line"><span>ctx.text : string [R:pre,layout read-only]</span></span>
<span class="line"><span>    Deprecated and scheduled for removal. Use ctx.global.text to read or rewrite the current text. DEPRECATED.</span></span>
<span class="line"><span>ctx.char_count : integer [R:layout,path read-only]</span></span>
<span class="line"><span>    Number of active characters after layout generation.</span></span>
<span class="line"><span>ctx.part_count : integer [R:layout,path read-only]</span></span>
<span class="line"><span>    Number of active parts after layout generation.</span></span>
<span class="line"><span>ctx.canvas : MtCanvas [R:init,pre,layout,path read-only]</span></span>
<span class="line"><span>    Canvas dimensions.</span></span>
<span class="line"><span>ctx.fonts : string[] [R:init,pre,layout,path read-only]</span></span>
<span class="line"><span>    Available font names accepted by layout.font_name, indexed from 1.</span></span>
<span class="line"><span>ctx.timeline : MtTimeline [R:pre,layout,path read-only]</span></span>
<span class="line"><span>    Host clip timing information.</span></span>
<span class="line"><span>ctx.font : MtFontMetrics [R:layout,path read-only]</span></span>
<span class="line"><span>    Resolved font metrics in normalized canvas coordinates.</span></span>
<span class="line"><span>ctx.meta : MtMeta [R:init,pre,layout,path read-only]</span></span>
<span class="line"><span>    Read-only API, plugin, and capability metadata.</span></span>
<span class="line"><span>ctx.global : MtGlobal [R:pre,layout,path read-only]</span></span>
<span class="line"><span>    Writable base global parameters.</span></span>
<span class="line"><span>ctx.camera : MtCamera [R:pre,layout,path read-only]</span></span>
<span class="line"><span>    Writable base 3D camera parameters.</span></span>
<span class="line"><span>ctx.chars : MtCharacter[] [R:layout,path read-only]</span></span>
<span class="line"><span>    Resolved characters, indexed from 1.</span></span>
<span class="line"><span>ctx.parts : MtPart[] [R:layout,path read-only]</span></span>
<span class="line"><span>    Resolved parts, indexed from 1.</span></span>
<span class="line"><span>ctx.paths : MtPathCollection [R:path read-only]</span></span>
<span class="line"><span>    Lazy selector for normalized drawing paths available in OnPath. (since API level 5)</span></span>
<span class="line"><span>ctx.bounding_box : MtBoundingBox [R:layout,path read-only]</span></span>
<span class="line"><span>    Writable bounding-box drawing parameters.</span></span>
<span class="line"><span>ctx.output : MtOutput [R:layout,path read-only]</span></span>
<span class="line"><span>    Writable output filtering and ordering parameters.</span></span></code></pre></div><h3 id="ctx-canvas" tabindex="-1">ctx.canvas <a class="header-anchor" href="#ctx-canvas" aria-label="Permalink to &quot;ctx.canvas&quot;">​</a></h3><div class="language-text vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">text</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>ctx.canvas.width : number [R:init,pre,layout,path read-only]</span></span>
<span class="line"><span>    unit=px  base=canvas width</span></span>
<span class="line"><span>    Canvas width in pixels.</span></span>
<span class="line"><span>ctx.canvas.height : number [R:init,pre,layout,path read-only]</span></span>
<span class="line"><span>    unit=px  base=canvas height</span></span>
<span class="line"><span>    Canvas height in pixels.</span></span>
<span class="line"><span>ctx.canvas.aspect_ratio : number [R:init,pre,layout,path read-only]</span></span>
<span class="line"><span>    unit=ratio  base=width / height</span></span>
<span class="line"><span>    Canvas width divided by height.</span></span>
<span class="line"><span>ctx.canvas.pixel_aspect_ratio : number [R:init,pre,layout,path read-only]</span></span>
<span class="line"><span>    unit=ratio  base=pixel width / pixel height</span></span>
<span class="line"><span>    Host project pixel aspect ratio.</span></span></code></pre></div><h3 id="ctx-timeline" tabindex="-1">ctx.timeline <a class="header-anchor" href="#ctx-timeline" aria-label="Permalink to &quot;ctx.timeline&quot;">​</a></h3><div class="language-text vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">text</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>ctx.timeline.available : boolean [R:pre,layout,path read-only]</span></span>
<span class="line"><span>    Whether the host supplied a finite clip range.</span></span>
<span class="line"><span>ctx.timeline.start_frame : number [R:pre,layout,path read-only]</span></span>
<span class="line"><span>    unit=frames</span></span>
<span class="line"><span>    First frame of the clip range in clip-local time (always 0 while available).</span></span>
<span class="line"><span>ctx.timeline.end_frame : number [R:pre,layout,path read-only]</span></span>
<span class="line"><span>    unit=frames</span></span>
<span class="line"><span>    Last frame of the clip range in clip-local time (equals duration_frames).</span></span>
<span class="line"><span>ctx.timeline.duration_frames : number [R:pre,layout,path read-only]</span></span>
<span class="line"><span>    unit=frames</span></span>
<span class="line"><span>    Clip range length measured from start_frame to end_frame.</span></span>
<span class="line"><span>ctx.timeline.duration_seconds : number [R:pre,layout,path read-only]</span></span>
<span class="line"><span>    unit=seconds</span></span>
<span class="line"><span>    Clip range length in seconds.</span></span>
<span class="line"><span>ctx.timeline.progress : number [R:pre,layout,path read-only]</span></span>
<span class="line"><span>    unit=unit_interval</span></span>
<span class="line"><span>    Current normalized progress through the clip range, clamped to 0 through 1.</span></span></code></pre></div><h3 id="ctx-font" tabindex="-1">ctx.font <a class="header-anchor" href="#ctx-font" aria-label="Permalink to &quot;ctx.font&quot;">​</a></h3><div class="language-text vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">text</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>ctx.font.ascent : number [R:layout,path read-only]</span></span>
<span class="line"><span>    unit=canvas_ratio_length  base=canvas height</span></span>
<span class="line"><span>    Font ascent normalized by canvas height.</span></span>
<span class="line"><span>ctx.font.descent : number [R:layout,path read-only]</span></span>
<span class="line"><span>    unit=canvas_ratio_length  base=canvas height</span></span>
<span class="line"><span>    Positive font descent magnitude normalized by canvas height.</span></span>
<span class="line"><span>ctx.font.line_height : number [R:layout,path read-only]</span></span>
<span class="line"><span>    unit=canvas_ratio_length  base=canvas height</span></span>
<span class="line"><span>    Recommended font line height normalized by canvas height.</span></span>
<span class="line"><span>ctx.font.units_per_em : number [R:layout,path read-only]</span></span>
<span class="line"><span>    unit=font_design_units  base=em square</span></span>
<span class="line"><span>    Font design units per em.</span></span></code></pre></div><h3 id="ctx-meta-capabilities" tabindex="-1">ctx.meta.capabilities <a class="header-anchor" href="#ctx-meta-capabilities" aria-label="Permalink to &quot;ctx.meta.capabilities&quot;">​</a></h3><div class="language-text vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">text</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>ctx.meta.capabilities.has_3d : boolean [R:init,pre,layout,path read-only]</span></span>
<span class="line"><span>    Whether 3D projection parameters affect Native rendering.</span></span></code></pre></div><h3 id="ctx-meta" tabindex="-1">ctx.meta <a class="header-anchor" href="#ctx-meta" aria-label="Permalink to &quot;ctx.meta&quot;">​</a></h3><div class="language-text vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">text</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>ctx.meta.api_level : integer [R:init,pre,layout,path read-only]</span></span>
<span class="line"><span>    Mug Typography Lua API compatibility level.</span></span>
<span class="line"><span>ctx.meta.plugin_version : string [R:init,pre,layout,path read-only]</span></span>
<span class="line"><span>    Plugin version for diagnostics and display.</span></span>
<span class="line"><span>ctx.meta.capabilities : MtCapabilities [R:init,pre,layout,path read-only]</span></span>
<span class="line"><span>    Native preset feature availability.</span></span>
<span class="line"><span>ctx.meta.limits : MtLimits [R:init,pre,layout,path read-only]</span></span>
<span class="line"><span>    Maximum character and part capacities for this instance.</span></span>
<span class="line"><span>ctx.meta.instance_seed : integer [R:init,pre,layout,path read-only]</span></span>
<span class="line"><span>    Stable per-instance random seed, distinct across instances of the same script and constant for the lifetime of one instance. Use it with mt.random/mt.random_range instead of a fixed literal seed so per-character variance differs across instances instead of repeating the same pattern.</span></span></code></pre></div><h3 id="ctx-meta-limits" tabindex="-1">ctx.meta.limits <a class="header-anchor" href="#ctx-meta-limits" aria-label="Permalink to &quot;ctx.meta.limits&quot;">​</a></h3><div class="language-text vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">text</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>ctx.meta.limits.max_characters : integer [R:init,pre,layout,path read-only]</span></span>
<span class="line"><span>    Maximum characters addressable by host parameter groups.</span></span>
<span class="line"><span>ctx.meta.limits.max_parts : integer [R:init,pre,layout,path read-only]</span></span>
<span class="line"><span>    Maximum parts addressable by host parameter groups.</span></span></code></pre></div><h3 id="ctx-global" tabindex="-1">ctx.global <a class="header-anchor" href="#ctx-global" aria-label="Permalink to &quot;ctx.global&quot;">​</a></h3><div class="language-text vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">text</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>ctx.global.text : string [R:pre,layout,path W:pre]</span></span>
<span class="line"><span>    Text to shape and lay out.</span></span>
<span class="line"><span>ctx.global.font_name : string [R:pre,layout,path W:pre]</span></span>
<span class="line"><span>    Font family identity used for shaping.</span></span>
<span class="line"><span>ctx.global.tracking : number [R:pre,layout,path W:pre]</span></span>
<span class="line"><span>    unit=em  base=font size (1.0 = 1 em)</span></span>
<span class="line"><span>    Additional character tracking.</span></span>
<span class="line"><span>ctx.global.line_spacing : number [R:pre,layout,path W:pre]</span></span>
<span class="line"><span>    unit=multiplier  neutral=1</span></span>
<span class="line"><span>    Line spacing multiplier.</span></span>
<span class="line"><span>ctx.global.vertical : boolean [R:pre,layout,path W:pre]</span></span>
<span class="line"><span>    Whether vertical writing is enabled.</span></span>
<span class="line"><span>ctx.global.h_align : string [R:pre,layout,path W:pre]</span></span>
<span class="line"><span>    values=left|center|right</span></span>
<span class="line"><span>    Horizontal alignment.</span></span>
<span class="line"><span>ctx.global.v_align : string [R:pre,layout,path W:pre]</span></span>
<span class="line"><span>    values=top|center|bottom|baseline</span></span>
<span class="line"><span>    Vertical alignment.</span></span>
<span class="line"><span>ctx.global.margins : number[] [R:pre,layout,path W:pre]</span></span>
<span class="line"><span>    unit=em  base=font size (1.0 = 1 em)</span></span>
<span class="line"><span>    Per-character margins.</span></span>
<span class="line"><span>ctx.global.position_x : number [R:pre,layout,path W:pre]</span></span>
<span class="line"><span>    unit=canvas_ratio_position  base=canvas width (0.5 = center)</span></span>
<span class="line"><span>    Global X position; 0.5 is the canvas center.</span></span>
<span class="line"><span>ctx.global.position_y : number [R:pre,layout,path W:pre]</span></span>
<span class="line"><span>    unit=canvas_ratio_position  axis=y_up  base=canvas height (0.5 = center)</span></span>
<span class="line"><span>    Global Y position; 0.5 is the canvas center and values grow upward.</span></span>
<span class="line"><span>ctx.global.rotation : number [R:pre,layout,path W:pre]</span></span>
<span class="line"><span>    unit=degrees  neutral=0  axis=clockwise_positive</span></span>
<span class="line"><span>    Global rotation in degrees.</span></span>
<span class="line"><span>ctx.global.yaw : number [R:pre,layout,path W:pre]</span></span>
<span class="line"><span>    unit=degrees  neutral=0  axis=object_yaw  base=+ turns the right edge toward the viewer (-Z)</span></span>
<span class="line"><span>    Global yaw in degrees; used by the 3D preset.</span></span>
<span class="line"><span>ctx.global.pitch : number [R:pre,layout,path W:pre]</span></span>
<span class="line"><span>    unit=degrees  neutral=0  axis=object_pitch  base=+ turns the top edge toward the viewer (-Z)</span></span>
<span class="line"><span>    Global pitch in degrees; used by the 3D preset.</span></span>
<span class="line"><span>ctx.global.scale : number [R:pre,layout,path W:pre]</span></span>
<span class="line"><span>    unit=multiplier  neutral=1  range=0.0001..+inf</span></span>
<span class="line"><span>    Uniform global scale.</span></span>
<span class="line"><span>ctx.global.stretch_x : number [R:pre,layout,path W:pre]</span></span>
<span class="line"><span>    unit=multiplier  neutral=1  base=horizontal</span></span>
<span class="line"><span>    Horizontal global stretch.</span></span>
<span class="line"><span>ctx.global.stretch_y : number [R:pre,layout,path W:pre]</span></span>
<span class="line"><span>    unit=multiplier  neutral=1  base=vertical</span></span>
<span class="line"><span>    Vertical global stretch.</span></span>
<span class="line"><span>ctx.global.pivot_x : number [R:pre,layout,path W:pre]</span></span>
<span class="line"><span>    unit=canvas_ratio_displacement  neutral=0.5  base=canvas width, measured from global.position</span></span>
<span class="line"><span>    Global pivot X displacement from global position in canvas-normalized units; 0.5 means zero displacement.</span></span>
<span class="line"><span>ctx.global.pivot_y : number [R:pre,layout,path W:pre]</span></span>
<span class="line"><span>    unit=canvas_ratio_displacement  neutral=0.5  axis=y_up  base=canvas height, measured from global.position</span></span>
<span class="line"><span>    Global pivot Y displacement from global position in canvas-normalized units; 0.5 means zero displacement and values grow upward.</span></span>
<span class="line"><span>ctx.global.opacity : number [R:pre,layout,path W:pre]</span></span>
<span class="line"><span>    unit=unit_interval  neutral=1</span></span>
<span class="line"><span>    Overall opacity multiplier in the range 0 to 1 applied to everything the effect draws (fill, gradient, stroke, shadow, bounding box).</span></span>
<span class="line"><span>ctx.global.fill : MtGlobalFill [R:pre,layout,path W:pre]</span></span>
<span class="line"><span>    Global fill color settings.</span></span>
<span class="line"><span>ctx.global.gradient : MtGradient [R:pre,layout,path W:pre]</span></span>
<span class="line"><span>    Global gradient settings.</span></span>
<span class="line"><span>ctx.global.stroke : MtGlobalStroke [R:pre,layout,path W:pre]</span></span>
<span class="line"><span>    Resolved global stroke settings.</span></span>
<span class="line"><span>ctx.global.shadow : MtGlobalShadow [R:pre,layout,path W:pre]</span></span>
<span class="line"><span>    Global shadow settings.</span></span></code></pre></div><h3 id="ctx-global-fill" tabindex="-1">ctx.global.fill <a class="header-anchor" href="#ctx-global-fill" aria-label="Permalink to &quot;ctx.global.fill&quot;">​</a></h3><div class="language-text vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">text</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>ctx.global.fill.color : MtColor [R:pre,layout,path W:pre]</span></span>
<span class="line"><span>    Global fill color.</span></span>
<span class="line"><span>ctx.global.fill.transparent : boolean [R:pre,layout,path W:pre]</span></span>
<span class="line"><span>    Whether the fill is transparent while stroke and effects remain visible.</span></span></code></pre></div><h3 id="ctx-global-gradient" tabindex="-1">ctx.global.gradient <a class="header-anchor" href="#ctx-global-gradient" aria-label="Permalink to &quot;ctx.global.gradient&quot;">​</a></h3><div class="language-text vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">text</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>ctx.global.gradient.color_space : string [R:pre,layout,path W:pre]</span></span>
<span class="line"><span>    values=none|okhsv|okhsl|oklab|linear_rgb|crayon</span></span>
<span class="line"><span>    Gradient mode; none disables the gradient.</span></span>
<span class="line"><span>ctx.global.gradient.end_color : MtColor [R:pre,layout,path W:pre]</span></span>
<span class="line"><span>    Gradient end color.</span></span>
<span class="line"><span>ctx.global.gradient.midpoint : number [R:pre,layout,path W:pre]</span></span>
<span class="line"><span>    unit=unit_interval</span></span>
<span class="line"><span>    Gradient midpoint in the range 0 to 1.</span></span>
<span class="line"><span>ctx.global.gradient.angle : number [R:pre,layout,path W:pre]</span></span>
<span class="line"><span>    unit=degrees  neutral=0  axis=clockwise_positive  base=0 = left-to-right (+X)</span></span>
<span class="line"><span>    Gradient angle in degrees; 0 runs left to right and positive rotates clockwise.</span></span>
<span class="line"><span>ctx.global.gradient.start_position : number [R:pre,layout,path W:pre]</span></span>
<span class="line"><span>    unit=gradient_position  base=transformed global bounding box; 0.0-1.0 is the standard range</span></span>
<span class="line"><span>    Gradient start position relative to the transformed text BB.</span></span>
<span class="line"><span>ctx.global.gradient.end_position : number [R:pre,layout,path W:pre]</span></span>
<span class="line"><span>    unit=gradient_position  base=transformed global bounding box; 0.0-1.0 is the standard range</span></span>
<span class="line"><span>    Gradient end position relative to the transformed text BB.</span></span></code></pre></div><h3 id="ctx-global-stroke" tabindex="-1">ctx.global.stroke <a class="header-anchor" href="#ctx-global-stroke" aria-label="Permalink to &quot;ctx.global.stroke&quot;">​</a></h3><div class="language-text vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">text</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>ctx.global.stroke.width : number [R:pre,layout,path W:pre]</span></span>
<span class="line"><span>    unit=em  base=font size (1.0 = 1 em)</span></span>
<span class="line"><span>    Resolved global stroke width.</span></span>
<span class="line"><span>ctx.global.stroke.gap : number [R:pre,layout,path W:pre]</span></span>
<span class="line"><span>    unit=em  base=font size (1.0 = 1 em)</span></span>
<span class="line"><span>    Resolved global fill-to-stroke gap.</span></span>
<span class="line"><span>ctx.global.stroke.color : MtColor [R:pre,layout,path W:pre]</span></span>
<span class="line"><span>    Resolved global stroke color.</span></span>
<span class="line"><span>ctx.global.stroke.order : string [R:pre,layout,path W:pre]</span></span>
<span class="line"><span>    values=fill_over_stroke|stroke_over_fill</span></span>
<span class="line"><span>    Whether fill or stroke is drawn on top.</span></span>
<span class="line"><span>ctx.global.stroke.join : string [R:pre,layout,path W:pre]</span></span>
<span class="line"><span>    values=miter_clip|round|bevel|miter_round|miter_bevel</span></span>
<span class="line"><span>    Stroke corner join style.</span></span>
<span class="line"><span>ctx.global.stroke.miter_limit : number [R:pre,layout,path W:pre]</span></span>
<span class="line"><span>    unit=multiplier  neutral=1</span></span>
<span class="line"><span>    Maximum length of sharp miter joins.</span></span></code></pre></div><h3 id="ctx-global-shadow" tabindex="-1">ctx.global.shadow <a class="header-anchor" href="#ctx-global-shadow" aria-label="Permalink to &quot;ctx.global.shadow&quot;">​</a></h3><div class="language-text vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">text</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>ctx.global.shadow.enabled : boolean [R:pre,layout,path W:pre]</span></span>
<span class="line"><span>    Whether the global shadow pass is enabled.</span></span>
<span class="line"><span>ctx.global.shadow.distance : number [R:pre,layout,path W:pre]</span></span>
<span class="line"><span>    unit=canvas_short_side_percent  range=-inf..10  base=min(canvas.width, canvas.height); 1.0 = 1%</span></span>
<span class="line"><span>    Global shadow distance, in percent of the canvas short side (1.0 = 1% of min(width, height)).</span></span>
<span class="line"><span>ctx.global.shadow.angle : number [R:pre,layout,path W:pre]</span></span>
<span class="line"><span>    unit=degrees  neutral=0  axis=clockwise_positive  base=0 = right (+X), 90 = straight DOWN</span></span>
<span class="line"><span>    Global shadow angle in degrees; 0 casts the shadow to the right and positive rotates clockwise (90 = straight down).</span></span>
<span class="line"><span>ctx.global.shadow.color : MtColor [R:pre,layout,path W:pre]</span></span>
<span class="line"><span>    Resolved global shadow color.</span></span></code></pre></div><h3 id="ctx-camera" tabindex="-1">ctx.camera <a class="header-anchor" href="#ctx-camera" aria-label="Permalink to &quot;ctx.camera&quot;">​</a></h3><div class="language-text vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">text</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>ctx.camera.target_x : number [R:pre,layout,path W:pre]</span></span>
<span class="line"><span>    unit=canvas_ratio_position  base=canvas width (0.5 = center)</span></span>
<span class="line"><span>    Camera target X in host-normalized coordinates.</span></span>
<span class="line"><span>ctx.camera.target_y : number [R:pre,layout,path W:pre]</span></span>
<span class="line"><span>    unit=canvas_ratio_position  axis=y_up  base=canvas height (0.5 = center)</span></span>
<span class="line"><span>    Camera target Y in host-normalized coordinates; values grow upward.</span></span>
<span class="line"><span>ctx.camera.yaw : number [R:pre,layout,path W:pre]</span></span>
<span class="line"><span>    unit=degrees  neutral=0  axis=camera_orbit  base=+ orbits the camera to the RIGHT of the target (subject appears to turn left)</span></span>
<span class="line"><span>    Camera orbit yaw in degrees.</span></span>
<span class="line"><span>ctx.camera.pitch : number [R:pre,layout,path W:pre]</span></span>
<span class="line"><span>    unit=degrees  neutral=0  axis=camera_orbit  base=+ orbits the camera UP (looking down at the subject)</span></span>
<span class="line"><span>    Camera orbit pitch in degrees.</span></span>
<span class="line"><span>ctx.camera.perspective : number [R:pre,layout,path W:pre]</span></span>
<span class="line"><span>    unit=perspective_strength  base=distancePx = f(perspective) * canvas.height; larger = camera closer</span></span>
<span class="line"><span>    Perspective strength.</span></span>
<span class="line"><span>ctx.camera.zoom : number [R:pre,layout,path W:pre]</span></span>
<span class="line"><span>    unit=multiplier  neutral=1  range=0.001..+inf</span></span>
<span class="line"><span>    Camera zoom multiplier.</span></span>
<span class="line"><span>ctx.camera.lens_shift_x : number [R:pre,layout,path W:pre]</span></span>
<span class="line"><span>    unit=canvas_ratio_length  neutral=0  base=canvas width</span></span>
<span class="line"><span>    Horizontal lens shift as a canvas fraction.</span></span>
<span class="line"><span>ctx.camera.lens_shift_y : number [R:pre,layout,path W:pre]</span></span>
<span class="line"><span>    unit=canvas_ratio_length  neutral=0  axis=y_up  base=canvas height</span></span>
<span class="line"><span>    Vertical lens shift as a canvas fraction; values grow upward.</span></span></code></pre></div><h3 id="ctx-chars-i" tabindex="-1">ctx.chars[i] <a class="header-anchor" href="#ctx-chars-i" aria-label="Permalink to &quot;ctx.chars[i]&quot;">​</a></h3><div class="language-text vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">text</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>ctx.chars[i].index : integer [R:layout,path read-only]</span></span>
<span class="line"><span>    One-based character index.</span></span>
<span class="line"><span>ctx.chars[i].text : string [R:layout,path read-only]</span></span>
<span class="line"><span>    Text represented by this shaped character cluster.</span></span>
<span class="line"><span>ctx.chars[i].part_start : integer [R:layout,path read-only]</span></span>
<span class="line"><span>    One-based global index of this character&#39;s first part.</span></span>
<span class="line"><span>ctx.chars[i].part_count : integer [R:layout,path read-only]</span></span>
<span class="line"><span>    Number of parts belonging to this character.</span></span>
<span class="line"><span>ctx.chars[i].line_index : integer [R:layout,path read-only]</span></span>
<span class="line"><span>    One-based source layout line index.</span></span>
<span class="line"><span>ctx.chars[i].geometry : MtCharacterGeometry [R:layout,path read-only]</span></span>
<span class="line"><span>    Read-only base character geometry before script transforms.</span></span>
<span class="line"><span>ctx.chars[i].offset_x : number [R:layout,path W:layout]</span></span>
<span class="line"><span>    unit=canvas_ratio_displacement  neutral=0.5  base=canvas width</span></span>
<span class="line"><span>    Character X offset; 0.5 is no displacement.</span></span>
<span class="line"><span>ctx.chars[i].offset_y : number [R:layout,path W:layout]</span></span>
<span class="line"><span>    unit=canvas_ratio_displacement  neutral=0.5  axis=y_up  base=canvas height</span></span>
<span class="line"><span>    Character Y offset; 0.5 is no displacement and values grow upward.</span></span>
<span class="line"><span>ctx.chars[i].pivot_x : number [R:layout,path W:layout]</span></span>
<span class="line"><span>    unit=canvas_ratio_displacement  neutral=0.5  base=canvas width, measured from the character&#39;s natural bounds center</span></span>
<span class="line"><span>    Character pivot X displacement from the character&#39;s natural bounds center, in canvas-normalized units; 0.5 means zero displacement.</span></span>
<span class="line"><span>ctx.chars[i].pivot_y : number [R:layout,path W:layout]</span></span>
<span class="line"><span>    unit=canvas_ratio_displacement  neutral=0.5  axis=y_up  base=canvas height, measured from the character&#39;s natural bounds center</span></span>
<span class="line"><span>    Character pivot Y displacement from the character&#39;s natural bounds center, in canvas-normalized units; 0.5 means zero displacement and values grow upward.</span></span>
<span class="line"><span>ctx.chars[i].scale : number [R:layout,path W:layout]</span></span>
<span class="line"><span>    unit=multiplier  neutral=1  range=0.001..+inf</span></span>
<span class="line"><span>    Uniform character scale.</span></span>
<span class="line"><span>ctx.chars[i].stretch_x : number [R:layout,path W:layout]</span></span>
<span class="line"><span>    unit=multiplier  neutral=1  base=horizontal</span></span>
<span class="line"><span>    Horizontal character stretch.</span></span>
<span class="line"><span>ctx.chars[i].stretch_y : number [R:layout,path W:layout]</span></span>
<span class="line"><span>    unit=multiplier  neutral=1  base=vertical</span></span>
<span class="line"><span>    Vertical character stretch.</span></span>
<span class="line"><span>ctx.chars[i].rotation : number [R:layout,path W:layout]</span></span>
<span class="line"><span>    unit=degrees  neutral=0  axis=clockwise_positive</span></span>
<span class="line"><span>    Character rotation in degrees.</span></span>
<span class="line"><span>ctx.chars[i].z : number [R:layout,path W:layout]</span></span>
<span class="line"><span>    unit=canvas_ratio_length  neutral=0  axis=z_into_screen  base=positive = deeper/away from camera</span></span>
<span class="line"><span>    Character Z position.</span></span>
<span class="line"><span>ctx.chars[i].yaw : number [R:layout,path W:layout]</span></span>
<span class="line"><span>    unit=degrees  neutral=0  axis=object_yaw  base=+ turns the right edge toward the viewer (-Z)</span></span>
<span class="line"><span>    Character yaw in degrees.</span></span>
<span class="line"><span>ctx.chars[i].pitch : number [R:layout,path W:layout]</span></span>
<span class="line"><span>    unit=degrees  neutral=0  axis=object_pitch  base=+ turns the top edge toward the viewer (-Z)</span></span>
<span class="line"><span>    Character pitch in degrees.</span></span>
<span class="line"><span>ctx.chars[i].opacity : number [R:layout,path W:layout]</span></span>
<span class="line"><span>    unit=unit_interval  neutral=1</span></span>
<span class="line"><span>    Character opacity multiplier in the range 0 to 1 applied to the resolved fill, gradient, stroke, and shadow.</span></span>
<span class="line"><span>ctx.chars[i].fill : MtIndividualFill [R:layout,path W:layout]</span></span>
<span class="line"><span>    Individual fill color override.</span></span>
<span class="line"><span>ctx.chars[i].stroke : MtIndividualStroke [R:layout,path W:layout]</span></span>
<span class="line"><span>    Individual stroke override.</span></span>
<span class="line"><span>ctx.chars[i].shadow : MtIndividualShadow [R:layout,path W:layout]</span></span>
<span class="line"><span>    Individual shadow color override.</span></span></code></pre></div><h3 id="ctx-chars-i-fill-ctx-parts-i-fill" tabindex="-1">ctx.chars[i].fill / ctx.parts[i].fill <a class="header-anchor" href="#ctx-chars-i-fill-ctx-parts-i-fill" aria-label="Permalink to &quot;ctx.chars[i].fill / ctx.parts[i].fill&quot;">​</a></h3><div class="language-text vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">text</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>ctx.chars[i].fill / ctx.parts[i].fill.use : boolean [R:layout,path W:layout]</span></span>
<span class="line"><span>    Whether the individual fill color is used instead of the inherited one.</span></span>
<span class="line"><span>ctx.chars[i].fill / ctx.parts[i].fill.color : MtColor [R:layout,path W:layout]</span></span>
<span class="line"><span>    Raw individual fill color.</span></span></code></pre></div><h3 id="ctx-chars-i-stroke-ctx-parts-i-stroke" tabindex="-1">ctx.chars[i].stroke / ctx.parts[i].stroke <a class="header-anchor" href="#ctx-chars-i-stroke-ctx-parts-i-stroke" aria-label="Permalink to &quot;ctx.chars[i].stroke / ctx.parts[i].stroke&quot;">​</a></h3><div class="language-text vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">text</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>ctx.chars[i].stroke / ctx.parts[i].stroke.use : boolean [R:layout,path W:layout]</span></span>
<span class="line"><span>    Whether the individual stroke settings are used instead of the inherited ones.</span></span>
<span class="line"><span>ctx.chars[i].stroke / ctx.parts[i].stroke.width : number [R:layout,path W:layout]</span></span>
<span class="line"><span>    unit=em  base=font size (1.0 = 1 em)</span></span>
<span class="line"><span>    Raw individual stroke width.</span></span>
<span class="line"><span>ctx.chars[i].stroke / ctx.parts[i].stroke.gap : number [R:layout,path W:layout]</span></span>
<span class="line"><span>    unit=em  base=font size (1.0 = 1 em)</span></span>
<span class="line"><span>    Raw individual fill-to-stroke gap.</span></span>
<span class="line"><span>ctx.chars[i].stroke / ctx.parts[i].stroke.color : MtColor [R:layout,path W:layout]</span></span>
<span class="line"><span>    Raw individual stroke color.</span></span></code></pre></div><h3 id="ctx-chars-i-shadow-ctx-parts-i-shadow" tabindex="-1">ctx.chars[i].shadow / ctx.parts[i].shadow <a class="header-anchor" href="#ctx-chars-i-shadow-ctx-parts-i-shadow" aria-label="Permalink to &quot;ctx.chars[i].shadow / ctx.parts[i].shadow&quot;">​</a></h3><div class="language-text vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">text</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>ctx.chars[i].shadow / ctx.parts[i].shadow.use : boolean [R:layout,path W:layout]</span></span>
<span class="line"><span>    Whether the individual shadow color is used instead of the inherited one.</span></span>
<span class="line"><span>ctx.chars[i].shadow / ctx.parts[i].shadow.color : MtColor [R:layout,path W:layout]</span></span>
<span class="line"><span>    Raw individual shadow color.</span></span></code></pre></div><h3 id="ctx-parts-i" tabindex="-1">ctx.parts[i] <a class="header-anchor" href="#ctx-parts-i" aria-label="Permalink to &quot;ctx.parts[i]&quot;">​</a></h3><div class="language-text vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">text</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>ctx.parts[i].index : integer [R:layout,path read-only]</span></span>
<span class="line"><span>    One-based global part index.</span></span>
<span class="line"><span>ctx.parts[i].character_index : integer [R:layout,path read-only]</span></span>
<span class="line"><span>    One-based index of the owning character.</span></span>
<span class="line"><span>ctx.parts[i].index_in_character : integer [R:layout,path read-only]</span></span>
<span class="line"><span>    One-based part index within the owning character.</span></span>
<span class="line"><span>ctx.parts[i].geometry : MtPartGeometry [R:layout,path read-only]</span></span>
<span class="line"><span>    Read-only base part geometry before script transforms.</span></span>
<span class="line"><span>ctx.parts[i].offset_x : number [R:layout,path W:layout]</span></span>
<span class="line"><span>    unit=canvas_ratio_displacement  neutral=0.5  base=canvas width</span></span>
<span class="line"><span>    Part X offset; 0.5 is no displacement.</span></span>
<span class="line"><span>ctx.parts[i].offset_y : number [R:layout,path W:layout]</span></span>
<span class="line"><span>    unit=canvas_ratio_displacement  neutral=0.5  axis=y_up  base=canvas height</span></span>
<span class="line"><span>    Part Y offset; 0.5 is no displacement and values grow upward.</span></span>
<span class="line"><span>ctx.parts[i].pivot_x : number [R:layout,path W:layout]</span></span>
<span class="line"><span>    unit=canvas_ratio_displacement  neutral=0.5  base=canvas width, measured from the part&#39;s natural position</span></span>
<span class="line"><span>    Part pivot X displacement from the part&#39;s natural position, in canvas-normalized units; 0.5 means zero displacement.</span></span>
<span class="line"><span>ctx.parts[i].pivot_y : number [R:layout,path W:layout]</span></span>
<span class="line"><span>    unit=canvas_ratio_displacement  neutral=0.5  axis=y_up  base=canvas height, measured from the part&#39;s natural position</span></span>
<span class="line"><span>    Part pivot Y displacement from the part&#39;s natural position, in canvas-normalized units; 0.5 means zero displacement and values grow upward.</span></span>
<span class="line"><span>ctx.parts[i].scale : number [R:layout,path W:layout]</span></span>
<span class="line"><span>    unit=multiplier  neutral=1  range=0.001..+inf</span></span>
<span class="line"><span>    Uniform part scale.</span></span>
<span class="line"><span>ctx.parts[i].rotation : number [R:layout,path W:layout]</span></span>
<span class="line"><span>    unit=degrees  neutral=0  axis=clockwise_positive</span></span>
<span class="line"><span>    Part rotation in degrees.</span></span>
<span class="line"><span>ctx.parts[i].stretch_x : number [R:layout,path W:layout]</span></span>
<span class="line"><span>    unit=multiplier  neutral=1  base=horizontal</span></span>
<span class="line"><span>    Horizontal part stretch.</span></span>
<span class="line"><span>ctx.parts[i].stretch_y : number [R:layout,path W:layout]</span></span>
<span class="line"><span>    unit=multiplier  neutral=1  base=vertical</span></span>
<span class="line"><span>    Vertical part stretch.</span></span>
<span class="line"><span>ctx.parts[i].z : number [R:layout,path W:layout]</span></span>
<span class="line"><span>    unit=canvas_ratio_length  neutral=0  axis=z_into_screen  base=positive = deeper/away from camera</span></span>
<span class="line"><span>    Part Z position.</span></span>
<span class="line"><span>ctx.parts[i].yaw : number [R:layout,path W:layout]</span></span>
<span class="line"><span>    unit=degrees  neutral=0  axis=object_yaw  base=+ turns the right edge toward the viewer (-Z)</span></span>
<span class="line"><span>    Part yaw in degrees, applied at the part pivot inside the character&#39;s rotated space; script-only (no host parameter group backs it, unlike the character equivalent).</span></span>
<span class="line"><span>ctx.parts[i].pitch : number [R:layout,path W:layout]</span></span>
<span class="line"><span>    unit=degrees  neutral=0  axis=object_pitch  base=+ turns the top edge toward the viewer (-Z)</span></span>
<span class="line"><span>    Part pitch in degrees, applied at the part pivot inside the character&#39;s rotated space; script-only (no host parameter group backs it, unlike the character equivalent).</span></span>
<span class="line"><span>ctx.parts[i].opacity : number [R:layout,path W:layout]</span></span>
<span class="line"><span>    unit=unit_interval  neutral=1</span></span>
<span class="line"><span>    Part opacity multiplier in the range 0 to 1, combined with the owning character&#39;s opacity.</span></span>
<span class="line"><span>ctx.parts[i].fill : MtIndividualFill [R:layout,path W:layout]</span></span>
<span class="line"><span>    Individual fill color override.</span></span>
<span class="line"><span>ctx.parts[i].stroke : MtIndividualStroke [R:layout,path W:layout]</span></span>
<span class="line"><span>    Individual stroke override; script-only (no host parameter group backs it, unlike the character equivalent), so it always reads as unused/default unless a script sets it.</span></span>
<span class="line"><span>ctx.parts[i].shadow : MtIndividualShadow [R:layout,path W:layout]</span></span>
<span class="line"><span>    Individual shadow color override; script-only (no host parameter group backs it, unlike the character equivalent), so it always reads as unused/default unless a script sets it.</span></span></code></pre></div><h3 id="ctx-chars-i-geometry" tabindex="-1">ctx.chars[i].geometry <a class="header-anchor" href="#ctx-chars-i-geometry" aria-label="Permalink to &quot;ctx.chars[i].geometry&quot;">​</a></h3><div class="language-text vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">text</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>ctx.chars[i].geometry.canvas_origin_x : number [R:layout,path read-only]</span></span>
<span class="line"><span>    unit=canvas_ratio_position  base=canvas width (0.5 = center)</span></span>
<span class="line"><span>    Character placement origin X in normalized canvas coordinates.</span></span>
<span class="line"><span>ctx.chars[i].geometry.canvas_origin_y : number [R:layout,path read-only]</span></span>
<span class="line"><span>    unit=canvas_ratio_position  axis=y_up  base=canvas height (0.5 = center)</span></span>
<span class="line"><span>    Character placement origin Y in normalized canvas coordinates.</span></span>
<span class="line"><span>ctx.chars[i].geometry.vertical_origin_x : number [R:layout,path read-only]</span></span>
<span class="line"><span>    unit=canvas_ratio_position  base=canvas width (0.5 = center)</span></span>
<span class="line"><span>    Vertical-typesetting origin X (column axis) in normalized canvas coordinates. (since API level 2)</span></span>
<span class="line"><span>ctx.chars[i].geometry.vertical_origin_y : number [R:layout,path read-only]</span></span>
<span class="line"><span>    unit=canvas_ratio_position  axis=y_up  base=canvas height (0.5 = center)</span></span>
<span class="line"><span>    Vertical-typesetting origin Y (cell top) in normalized canvas coordinates. (since API level 2)</span></span>
<span class="line"><span>ctx.chars[i].geometry.bounds_center_x : number [R:layout,path read-only]</span></span>
<span class="line"><span>    unit=canvas_ratio_position  base=canvas width (0.5 = center)</span></span>
<span class="line"><span>    Base ink-bounds center X in normalized canvas coordinates.</span></span>
<span class="line"><span>ctx.chars[i].geometry.bounds_center_y : number [R:layout,path read-only]</span></span>
<span class="line"><span>    unit=canvas_ratio_position  axis=y_up  base=canvas height (0.5 = center)</span></span>
<span class="line"><span>    Base ink-bounds center Y in normalized canvas coordinates.</span></span>
<span class="line"><span>ctx.chars[i].geometry.bounds_width : number [R:layout,path read-only]</span></span>
<span class="line"><span>    unit=canvas_ratio_length  base=canvas width</span></span>
<span class="line"><span>    Base ink-bounds width normalized by canvas width.</span></span>
<span class="line"><span>ctx.chars[i].geometry.bounds_height : number [R:layout,path read-only]</span></span>
<span class="line"><span>    unit=canvas_ratio_length  base=canvas height</span></span>
<span class="line"><span>    Base ink-bounds height normalized by canvas height.</span></span>
<span class="line"><span>ctx.chars[i].geometry.advance_x : number [R:layout,path read-only]</span></span>
<span class="line"><span>    unit=canvas_ratio_length  base=canvas width</span></span>
<span class="line"><span>    Base horizontal advance normalized by canvas width.</span></span>
<span class="line"><span>ctx.chars[i].geometry.advance_y : number [R:layout,path read-only]</span></span>
<span class="line"><span>    unit=canvas_ratio_length  axis=y_up  base=canvas height (downward advance is negative)</span></span>
<span class="line"><span>    Base vertical advance normalized by canvas height, positive upward.</span></span></code></pre></div><h3 id="ctx-parts-i-geometry" tabindex="-1">ctx.parts[i].geometry <a class="header-anchor" href="#ctx-parts-i-geometry" aria-label="Permalink to &quot;ctx.parts[i].geometry&quot;">​</a></h3><div class="language-text vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">text</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>ctx.parts[i].geometry.local_center_x : number [R:layout,path read-only]</span></span>
<span class="line"><span>    unit=canvas_ratio_length  base=canvas width</span></span>
<span class="line"><span>    Part center X relative to its character origin, normalized by canvas width.</span></span>
<span class="line"><span>ctx.parts[i].geometry.local_center_y : number [R:layout,path read-only]</span></span>
<span class="line"><span>    unit=canvas_ratio_length  axis=y_up  base=canvas height, measured from the character origin</span></span>
<span class="line"><span>    Part center Y relative to its character origin, normalized by canvas height and positive upward.</span></span>
<span class="line"><span>ctx.parts[i].geometry.canvas_center_x : number [R:layout,path read-only]</span></span>
<span class="line"><span>    unit=canvas_ratio_position  base=canvas width (0.5 = center)</span></span>
<span class="line"><span>    Part center X in normalized canvas coordinates.</span></span>
<span class="line"><span>ctx.parts[i].geometry.canvas_center_y : number [R:layout,path read-only]</span></span>
<span class="line"><span>    unit=canvas_ratio_position  axis=y_up  base=canvas height (0.5 = center)</span></span>
<span class="line"><span>    Part center Y in normalized canvas coordinates.</span></span>
<span class="line"><span>ctx.parts[i].geometry.bounds_center_x : number [R:layout,path read-only]</span></span>
<span class="line"><span>    unit=canvas_ratio_position  base=canvas width (0.5 = center)</span></span>
<span class="line"><span>    Part ink-bounds center X in normalized canvas coordinates.</span></span>
<span class="line"><span>ctx.parts[i].geometry.bounds_center_y : number [R:layout,path read-only]</span></span>
<span class="line"><span>    unit=canvas_ratio_position  axis=y_up  base=canvas height (0.5 = center)</span></span>
<span class="line"><span>    Part ink-bounds center Y in normalized canvas coordinates.</span></span>
<span class="line"><span>ctx.parts[i].geometry.bounds_width : number [R:layout,path read-only]</span></span>
<span class="line"><span>    unit=canvas_ratio_length  base=canvas width</span></span>
<span class="line"><span>    Part ink-bounds width normalized by canvas width.</span></span>
<span class="line"><span>ctx.parts[i].geometry.bounds_height : number [R:layout,path read-only]</span></span>
<span class="line"><span>    unit=canvas_ratio_length  base=canvas height</span></span>
<span class="line"><span>    Part ink-bounds height normalized by canvas height.</span></span></code></pre></div><h3 id="ctx-bounding-box" tabindex="-1">ctx.bounding_box <a class="header-anchor" href="#ctx-bounding-box" aria-label="Permalink to &quot;ctx.bounding_box&quot;">​</a></h3><div class="language-text vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">text</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>ctx.bounding_box.enabled : boolean [R:layout,path W:layout]</span></span>
<span class="line"><span>    Whether the bounding box is drawn.</span></span>
<span class="line"><span>ctx.bounding_box.draw_top : boolean [R:layout,path W:layout]</span></span>
<span class="line"><span>    Whether the top edge is drawn.</span></span>
<span class="line"><span>ctx.bounding_box.draw_bottom : boolean [R:layout,path W:layout]</span></span>
<span class="line"><span>    Whether the bottom edge is drawn.</span></span>
<span class="line"><span>ctx.bounding_box.draw_left : boolean [R:layout,path W:layout]</span></span>
<span class="line"><span>    Whether the left edge is drawn.</span></span>
<span class="line"><span>ctx.bounding_box.draw_right : boolean [R:layout,path W:layout]</span></span>
<span class="line"><span>    Whether the right edge is drawn.</span></span>
<span class="line"><span>ctx.bounding_box.color : MtColor [R:layout,path W:layout]</span></span>
<span class="line"><span>    Bounding-box stroke color.</span></span>
<span class="line"><span>ctx.bounding_box.width : number [R:layout,path W:layout]</span></span>
<span class="line"><span>    unit=font_size_percent  base=100.0 = one font size</span></span>
<span class="line"><span>    Bounding-box stroke width.</span></span>
<span class="line"><span>ctx.bounding_box.fill_enabled : boolean [R:layout,path W:layout]</span></span>
<span class="line"><span>    Whether the bounding box background is filled.</span></span>
<span class="line"><span>ctx.bounding_box.fill_color : MtColor [R:layout,path W:layout]</span></span>
<span class="line"><span>    Bounding-box fill color.</span></span>
<span class="line"><span>ctx.bounding_box.fill_opacity : number [R:layout,path W:layout]</span></span>
<span class="line"><span>    unit=unit_interval</span></span>
<span class="line"><span>    Bounding-box fill opacity.</span></span>
<span class="line"><span>ctx.bounding_box.start_cap : string [R:layout,path W:layout]</span></span>
<span class="line"><span>    values=butt|square|round|round_rev|triangle|triangle_rev</span></span>
<span class="line"><span>    Bounding-box stroke start cap.</span></span>
<span class="line"><span>ctx.bounding_box.end_cap : string [R:layout,path W:layout]</span></span>
<span class="line"><span>    values=butt|square|round|round_rev|triangle|triangle_rev</span></span>
<span class="line"><span>    Bounding-box stroke end cap.</span></span>
<span class="line"><span>ctx.bounding_box.margin_x : number [R:layout,path W:layout]</span></span>
<span class="line"><span>    unit=font_size_percent  base=100.0 = one font size, horizontal</span></span>
<span class="line"><span>    Horizontal bounding-box margin.</span></span>
<span class="line"><span>ctx.bounding_box.margin_y : number [R:layout,path W:layout]</span></span>
<span class="line"><span>    unit=font_size_percent  axis=y_up  base=100.0 = one font size, vertical</span></span>
<span class="line"><span>    Vertical bounding-box margin.</span></span>
<span class="line"><span>ctx.bounding_box.corner_radius : number [R:layout,path W:layout]</span></span>
<span class="line"><span>    unit=font_size_percent  base=100.0 = one font size</span></span>
<span class="line"><span>    Bounding-box corner radius.</span></span>
<span class="line"><span>ctx.bounding_box.fill_offset_x : number [R:layout,path W:layout]</span></span>
<span class="line"><span>    unit=font_size_percent  base=100.0 = one font size, horizontal</span></span>
<span class="line"><span>    Horizontal fill offset.</span></span>
<span class="line"><span>ctx.bounding_box.fill_offset_y : number [R:layout,path W:layout]</span></span>
<span class="line"><span>    unit=font_size_percent  axis=y_up  base=100.0 = one font size, vertical</span></span>
<span class="line"><span>    Vertical fill offset.</span></span>
<span class="line"><span>ctx.bounding_box.stroke_offset_x : number [R:layout,path W:layout]</span></span>
<span class="line"><span>    unit=font_size_percent  base=100.0 = one font size, horizontal</span></span>
<span class="line"><span>    Horizontal stroke offset.</span></span>
<span class="line"><span>ctx.bounding_box.stroke_offset_y : number [R:layout,path W:layout]</span></span>
<span class="line"><span>    unit=font_size_percent  axis=y_up  base=100.0 = one font size, vertical</span></span>
<span class="line"><span>    Vertical stroke offset.</span></span></code></pre></div><h3 id="ctx-output" tabindex="-1">ctx.output <a class="header-anchor" href="#ctx-output" aria-label="Permalink to &quot;ctx.output&quot;">​</a></h3><div class="language-text vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">text</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>ctx.output.separation_enabled : boolean [R:layout,path read-only]</span></span>
<span class="line"><span>    Read-only host output-separation state.</span></span>
<span class="line"><span>ctx.output.render_mode : string [R:layout,path read-only]</span></span>
<span class="line"><span>    values=default|separation_1|separation_2</span></span>
<span class="line"><span>    Read-only host-selected separation output.</span></span>
<span class="line"><span>ctx.output.targets_1 : string [R:layout,path read-only]</span></span>
<span class="line"><span>    Read-only host targets assigned to separation output 1.</span></span>
<span class="line"><span>ctx.output.targets_2 : string [R:layout,path read-only]</span></span>
<span class="line"><span>    Read-only host targets assigned to separation output 2.</span></span>
<span class="line"><span>ctx.output.write_on_mode : string [R:layout,path W:layout]</span></span>
<span class="line"><span>    values=character|part</span></span>
<span class="line"><span>    Write-on unit.</span></span>
<span class="line"><span>ctx.output.write_on_start : number [R:layout,path W:layout]</span></span>
<span class="line"><span>    unit=unit_interval</span></span>
<span class="line"><span>    Start of the normalized visible write-on range from 0 to 1.</span></span>
<span class="line"><span>ctx.output.write_on_end : number [R:layout,path W:layout]</span></span>
<span class="line"><span>    unit=unit_interval</span></span>
<span class="line"><span>    End of the normalized visible write-on range from 0 to 1.</span></span>
<span class="line"><span>ctx.output.reorder_parts : boolean [R:layout,path W:layout]</span></span>
<span class="line"><span>    Whether parts use writing-direction stroke order.</span></span>
<span class="line"><span>ctx.output.manual_order_enabled : boolean [R:layout,path W:layout]</span></span>
<span class="line"><span>    Whether manual reveal and draw order is enabled.</span></span>
<span class="line"><span>ctx.output.manual_order_text : string [R:layout,path W:layout]</span></span>
<span class="line"><span>    Manual character and part order list.</span></span></code></pre></div><h3 id="part" tabindex="-1">part <a class="header-anchor" href="#part" aria-label="Permalink to &quot;part&quot;">​</a></h3><div class="language-text vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">text</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>part.index : integer [R:path read-only]</span></span>
<span class="line"><span>    One-based global part index. (since API level 5)</span></span>
<span class="line"><span>part.character_index : integer [R:path read-only]</span></span>
<span class="line"><span>    One-based index of the owning character. (since API level 5)</span></span>
<span class="line"><span>part.index_in_character : integer [R:path read-only]</span></span>
<span class="line"><span>    One-based part index within the owning character. (since API level 5)</span></span>
<span class="line"><span>part.line_index : integer [R:path read-only]</span></span>
<span class="line"><span>    One-based source layout line index. (since API level 5)</span></span>
<span class="line"><span>part.text : string [R:path read-only]</span></span>
<span class="line"><span>    Text represented by the owning shaped character cluster. (since API level 5)</span></span>
<span class="line"><span>part.path : MtDrawingPath [R:path read-only]</span></span>
<span class="line"><span>    Mutable path initialized from the original glyph part and committed atomically after OnPath succeeds. (since API level 5)</span></span></code></pre></div><h3 id="ctx-paths" tabindex="-1">ctx.paths <a class="header-anchor" href="#ctx-paths" aria-label="Permalink to &quot;ctx.paths&quot;">​</a></h3><div class="language-text vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">text</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>ctx.paths.units_per_em : number [R:path read-only]</span></span>
<span class="line"><span>    unit=path_units  base=em (always 1000)</span></span>
<span class="line"><span>    Normalized path coordinate scale. Always 1000 units per em. (since API level 5)</span></span>
<span class="line"><span>ctx.paths:part(index) -&gt; MtPathPart|nil [R:path read-only]</span></span>
<span class="line"><span>    Lazily get one part by its one-based global part index, or nil when absent. (since API level 5)</span></span>
<span class="line"><span>ctx.paths:character(index) -&gt; MtPathPart[] [R:path read-only]</span></span>
<span class="line"><span>    Lazily get every part owned by one one-based character index. (since API level 5)</span></span>
<span class="line"><span>ctx.paths:select(selector) -&gt; MtPathPart[] [R:path read-only]</span></span>
<span class="line"><span>    Lazily select parts with the character/part selector grammar, ordered by global part index. (since API level 5)</span></span></code></pre></div><h3 id="mtdrawingpath" tabindex="-1">MtDrawingPath <a class="header-anchor" href="#mtdrawingpath" aria-label="Permalink to &quot;MtDrawingPath&quot;">​</a></h3><div class="language-text vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">text</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>MtDrawingPath:clear() -&gt; nil [R:path read-only]</span></span>
<span class="line"><span>    Remove every command from this path. (since API level 5)</span></span>
<span class="line"><span>MtDrawingPath:assign(template) -&gt; nil [R:path read-only]</span></span>
<span class="line"><span>    Replace this path with a compiled mt.svg_path template. (since API level 5)</span></span>
<span class="line"><span>MtDrawingPath:set_svg(source) -&gt; nil [R:path read-only]</span></span>
<span class="line"><span>    Parse and replace this path from SVG path data in normalized 1000-units-per-em coordinates. (since API level 5)</span></span>
<span class="line"><span>MtDrawingPath:move_to(x, y) -&gt; nil [R:path read-only]</span></span>
<span class="line"><span>    Start a subpath at an absolute normalized local coordinate. (since API level 5)</span></span>
<span class="line"><span>MtDrawingPath:line_to(x, y) -&gt; nil [R:path read-only]</span></span>
<span class="line"><span>    Append a straight line to an absolute normalized local coordinate. (since API level 5)</span></span>
<span class="line"><span>MtDrawingPath:quad_to(cx, cy, x, y) -&gt; nil [R:path read-only]</span></span>
<span class="line"><span>    Append a quadratic Bezier segment. (since API level 5)</span></span>
<span class="line"><span>MtDrawingPath:cubic_to(cx1, cy1, cx2, cy2, x, y) -&gt; nil [R:path read-only]</span></span>
<span class="line"><span>    Append a cubic Bezier segment. (since API level 5)</span></span>
<span class="line"><span>MtDrawingPath:close() -&gt; nil [R:path read-only]</span></span>
<span class="line"><span>    Close the current subpath. (since API level 5)</span></span></code></pre></div><h3 id="color-value" tabindex="-1">color value <a class="header-anchor" href="#color-value" aria-label="Permalink to &quot;color value&quot;">​</a></h3><div class="language-text vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">text</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>color value.r : number [R:pre,layout,path W:pre,layout]</span></span>
<span class="line"><span>    unit=unit_interval</span></span>
<span class="line"><span>    Red channel in the range 0 to 1.</span></span>
<span class="line"><span>color value.g : number [R:pre,layout,path W:pre,layout]</span></span>
<span class="line"><span>    unit=unit_interval</span></span>
<span class="line"><span>    Green channel in the range 0 to 1.</span></span>
<span class="line"><span>color value.b : number [R:pre,layout,path W:pre,layout]</span></span>
<span class="line"><span>    unit=unit_interval</span></span>
<span class="line"><span>    Blue channel in the range 0 to 1.</span></span>
<span class="line"><span>color value.a : number [R:pre,layout,path W:pre,layout]</span></span>
<span class="line"><span>    unit=unit_interval</span></span>
<span class="line"><span>    Alpha channel in the range 0 to 1.</span></span></code></pre></div><h2 id="_13-mt-utility-reference" tabindex="-1">13. mt.* utility reference <a class="header-anchor" href="#_13-mt-utility-reference" aria-label="Permalink to &quot;13. mt.* utility reference&quot;">​</a></h2><p>All <code>mt.*</code> members are readable in every callback. Signatures list parameter names only.</p><h3 id="mt" tabindex="-1">mt.* <a class="header-anchor" href="#mt" aria-label="Permalink to &quot;mt.*&quot;">​</a></h3><div class="language-text vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">text</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>mt.storage : table</span></span>
<span class="line"><span>    Deprecated frozen storage; the Lua state persists across frames, so hold values in a local at chunk scope instead. DEPRECATED.</span></span>
<span class="line"><span>mt.ease : MtEase</span></span>
<span class="line"><span>    Easing function namespace.</span></span>
<span class="line"><span>mt.color : MtColorUtilities</span></span>
<span class="line"><span>    Color construction and interpolation namespace.</span></span>
<span class="line"><span>mt.layout : MtLayoutUtilities</span></span>
<span class="line"><span>    Layout and typesetting helper namespace.</span></span>
<span class="line"><span>mt.path : MtPathUtilities</span></span>
<span class="line"><span>    Closed-form motion path evaluation namespace.</span></span>
<span class="line"><span>mt.svg_path(source, optionsOrSourceUnitsPerEm?) -&gt; MtDrawingPath</span></span>
<span class="line"><span>    Compile SVG path data into an immutable normalized template. Accepts source units per em, or { view_box, em_scale } where em_scale 1.0 fits the view box to one em. (since API level 5)</span></span>
<span class="line"><span>mt.timeline : MtTimelineUtilities</span></span>
<span class="line"><span>    Timeline progress and interpolation namespace.</span></span>
<span class="line"><span>mt.text : MtTextUtilities</span></span>
<span class="line"><span>    UTF-8 safe text processing namespace.</span></span>
<span class="line"><span>mt.clamp(value, low, high) -&gt; number</span></span>
<span class="line"><span>    Clamp a value into a range.</span></span>
<span class="line"><span>mt.saturate(value) -&gt; number</span></span>
<span class="line"><span>    Clamp a value to the range 0 through 1.</span></span>
<span class="line"><span>mt.lerp(from, to, t) -&gt; number</span></span>
<span class="line"><span>    Linearly interpolate between two values.</span></span>
<span class="line"><span>mt.inverse_lerp(from, to, value) -&gt; number</span></span>
<span class="line"><span>    Return the interpolation factor of a value between two endpoints.</span></span>
<span class="line"><span>mt.remap(value, inLow, inHigh, outLow, outHigh, clamped?) -&gt; number</span></span>
<span class="line"><span>    Map a value between ranges.</span></span>
<span class="line"><span>mt.wrap(value, low, high) -&gt; number</span></span>
<span class="line"><span>    Wrap a value into a half-open range.</span></span>
<span class="line"><span>mt.lerp_angle(from, to, t) -&gt; number</span></span>
<span class="line"><span>    Interpolate degrees along the shortest angular path.</span></span>
<span class="line"><span>mt.distribute(index, count) -&gt; number</span></span>
<span class="line"><span>    Map a one-based index evenly across 0 through 1.</span></span>
<span class="line"><span>mt.falloff(distance, radius) -&gt; number</span></span>
<span class="line"><span>    Smooth bell-shaped influence weight: 1 at the centre, easing toward 0 with distance. (since API level 3)</span></span>
<span class="line"><span>mt.polar_offset(angleDegrees, radius) -&gt; number, number</span></span>
<span class="line"><span>    Deprecated screen-oriented polar vector, whose Y must be negated before it reaches offset_y; use polar_offset_2d. DEPRECATED. (since API level 3)</span></span>
<span class="line"><span>mt.polar_offset_2d(angleDegrees, radius) -&gt; number, number</span></span>
<span class="line"><span>    Converts a polar direction (degrees) and radius into a Y-up canvas offset pair, ready to add to offset_x and offset_y. (since API level 5)</span></span>
<span class="line"><span>mt.smoothstep(edge0, edge1, value) -&gt; number</span></span>
<span class="line"><span>    Smooth Hermite transition across a range.</span></span>
<span class="line"><span>mt.cycle(t, period) -&gt; number</span></span>
<span class="line"><span>    Repeating 0 to 1 ramp.</span></span>
<span class="line"><span>mt.pingpong(t, period) -&gt; number</span></span>
<span class="line"><span>    Repeating 0 to 1 to 0 motion.</span></span>
<span class="line"><span>mt.stagger(time, index, delay, duration) -&gt; number</span></span>
<span class="line"><span>    Per-index staggered progress in the range 0 to 1.</span></span>
<span class="line"><span>mt.keyframes(keys, time) -&gt; number|color</span></span>
<span class="line"><span>    Closed-form piecewise keyframe interpolation over number or color keys with optional per-segment easing.</span></span>
<span class="line"><span>mt.stagger_pattern(time, index, count, pattern, delay, duration, seed?) -&gt; number</span></span>
<span class="line"><span>    Staggered progress with configurable directional patterns.</span></span>
<span class="line"><span>mt.random(seed, index) -&gt; number</span></span>
<span class="line"><span>    Stable order-independent random value.</span></span>
<span class="line"><span>mt.random_range(seed, index, low, high) -&gt; number</span></span>
<span class="line"><span>    Stable random value in a requested range.</span></span>
<span class="line"><span>mt.noise1(x, seed?) -&gt; number</span></span>
<span class="line"><span>    Deterministic smooth one-dimensional value noise.</span></span>
<span class="line"><span>mt.noise2(x, y, seed?) -&gt; number</span></span>
<span class="line"><span>    Deterministic smooth two-dimensional value noise.</span></span>
<span class="line"><span>mt.spring(t, frequency, damping) -&gt; number</span></span>
<span class="line"><span>    Damped oscillation from 1 toward 0 (may go negative while overshooting). Intended for residual displacement, not raw 0–1 progress.</span></span>
<span class="line"><span>mt.wave(t, frequency, phase?) -&gt; number</span></span>
<span class="line"><span>    Sine wave shorthand.</span></span>
<span class="line"><span>mt.wave_square(t, frequency, phase?) -&gt; number</span></span>
<span class="line"><span>    Square wave shorthand (returns -1.0 or 1.0).</span></span>
<span class="line"><span>mt.wave_triangle(t, frequency, phase?) -&gt; number</span></span>
<span class="line"><span>    Triangle wave shorthand.</span></span>
<span class="line"><span>mt.wave_sawtooth(t, frequency, phase?) -&gt; number</span></span>
<span class="line"><span>    Sawtooth wave shorthand.</span></span>
<span class="line"><span>mt.wiggle(time, frequency, amplitude, octaves?, seed?) -&gt; number</span></span>
<span class="line"><span>    Deterministic layered value-noise wiggle; amplitude is the first octave&#39;s amplitude, not the summed maximum.</span></span>
<span class="line"><span>mt.bounce_y(paramsOrT, groundY, startY, gravity, restitution, startVelocity, squashStrength, stretchStrength, flexibility, damping) -&gt; table|number</span></span>
<span class="line"><span>    Closed-form 1D ballistic bounce calculation against a ground plane with continuous Squash &amp; Stretch. (since API level 3)</span></span>
<span class="line"><span>mt.bounce_x(paramsOrT, wallX, startX, acceleration, restitution, startVelocity, squashStrength, stretchStrength, flexibility, damping) -&gt; table|number</span></span>
<span class="line"><span>    Closed-form 1D ballistic bounce calculation against a vertical wall plane with continuous Squash &amp; Stretch. (since API level 3)</span></span>
<span class="line"><span>mt.bounce_ground(ctx, item, groundY, config?) -&gt; table</span></span>
<span class="line"><span>    Convenience API: Bounces a character or part item against a ground Canvas plane, automatically computing and applying offset_y, stretch_x, and stretch_y. (since API level 3)</span></span>
<span class="line"><span>mt.bounce_wall(ctx, item, wallX, config?) -&gt; table</span></span>
<span class="line"><span>    Convenience API: Bounces a character or part item against a vertical wall Canvas plane, automatically computing and applying offset_x, stretch_x, and stretch_y. (since API level 3)</span></span>
<span class="line"><span>mt.impact_squash(params) -&gt; number, number, number</span></span>
<span class="line"><span>    Closed-form squash-and-stretch impulse for collision events. (since API level 3)</span></span>
<span class="line"><span>mt.projectile_2d(paramsOrT, speed, angleDegrees, gravity, spin, drag) -&gt; table|number</span></span>
<span class="line"><span>    Closed-form 2D ballistic flight from a launch velocity under gravity, with optional spin and drag. (since API level 3)</span></span>
<span class="line"><span>mt.friction_decay(t, speed, friction) -&gt; number, number</span></span>
<span class="line"><span>    Closed-form exponential deceleration: distance travelled and remaining speed under friction. (since API level 3)</span></span></code></pre></div><h3 id="mt-color" tabindex="-1">mt.color.* <a class="header-anchor" href="#mt-color" aria-label="Permalink to &quot;mt.color.*&quot;">​</a></h3><div class="language-text vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">text</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>mt.color.lerp(from, to, t) -&gt; MtColor</span></span>
<span class="line"><span>    Interpolate two RGBA color tables.</span></span>
<span class="line"><span>mt.color.from_hsv(hue, saturation, value, alpha?) -&gt; MtColor</span></span>
<span class="line"><span>    Create an RGBA color from normalized HSV components.</span></span>
<span class="line"><span>mt.color.with_alpha(color, alpha) -&gt; MtColor</span></span>
<span class="line"><span>    Copy a color while replacing its alpha channel.</span></span>
<span class="line"><span>mt.color.from_oklch(lightness, chroma, hue, alpha?) -&gt; MtColor</span></span>
<span class="line"><span>    Create an RGBA color from OKLCH components.</span></span></code></pre></div><h3 id="mt-ease" tabindex="-1">mt.ease.* <a class="header-anchor" href="#mt-ease" aria-label="Permalink to &quot;mt.ease.*&quot;">​</a></h3><div class="language-text vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">text</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>mt.ease.linear(t) -&gt; number</span></span>
<span class="line"><span>    Apply linear easing.</span></span>
<span class="line"><span>mt.ease.in_quad(t) -&gt; number</span></span>
<span class="line"><span>    Apply in_quad easing.</span></span>
<span class="line"><span>mt.ease.out_quad(t) -&gt; number</span></span>
<span class="line"><span>    Apply out_quad easing.</span></span>
<span class="line"><span>mt.ease.in_out_quad(t) -&gt; number</span></span>
<span class="line"><span>    Apply in_out_quad easing.</span></span>
<span class="line"><span>mt.ease.in_cubic(t) -&gt; number</span></span>
<span class="line"><span>    Apply in_cubic easing.</span></span>
<span class="line"><span>mt.ease.out_cubic(t) -&gt; number</span></span>
<span class="line"><span>    Apply out_cubic easing.</span></span>
<span class="line"><span>mt.ease.in_out_cubic(t) -&gt; number</span></span>
<span class="line"><span>    Apply in_out_cubic easing.</span></span>
<span class="line"><span>mt.ease.in_quart(t) -&gt; number</span></span>
<span class="line"><span>    Apply in_quart easing.</span></span>
<span class="line"><span>mt.ease.out_quart(t) -&gt; number</span></span>
<span class="line"><span>    Apply out_quart easing.</span></span>
<span class="line"><span>mt.ease.in_out_quart(t) -&gt; number</span></span>
<span class="line"><span>    Apply in_out_quart easing.</span></span>
<span class="line"><span>mt.ease.in_sine(t) -&gt; number</span></span>
<span class="line"><span>    Apply in_sine easing.</span></span>
<span class="line"><span>mt.ease.out_sine(t) -&gt; number</span></span>
<span class="line"><span>    Apply out_sine easing.</span></span>
<span class="line"><span>mt.ease.in_out_sine(t) -&gt; number</span></span>
<span class="line"><span>    Apply in_out_sine easing.</span></span>
<span class="line"><span>mt.ease.in_circ(t) -&gt; number</span></span>
<span class="line"><span>    Apply in_circ easing.</span></span>
<span class="line"><span>mt.ease.out_circ(t) -&gt; number</span></span>
<span class="line"><span>    Apply out_circ easing.</span></span>
<span class="line"><span>mt.ease.in_out_circ(t) -&gt; number</span></span>
<span class="line"><span>    Apply in_out_circ easing.</span></span>
<span class="line"><span>mt.ease.in_expo(t) -&gt; number</span></span>
<span class="line"><span>    Apply in_expo easing.</span></span>
<span class="line"><span>mt.ease.out_expo(t) -&gt; number</span></span>
<span class="line"><span>    Apply out_expo easing.</span></span>
<span class="line"><span>mt.ease.in_out_expo(t) -&gt; number</span></span>
<span class="line"><span>    Apply in_out_expo easing.</span></span>
<span class="line"><span>mt.ease.in_back(t) -&gt; number</span></span>
<span class="line"><span>    Apply in_back easing.</span></span>
<span class="line"><span>mt.ease.out_back(t) -&gt; number</span></span>
<span class="line"><span>    Apply out_back easing.</span></span>
<span class="line"><span>mt.ease.in_out_back(t) -&gt; number</span></span>
<span class="line"><span>    Apply in_out_back easing.</span></span>
<span class="line"><span>mt.ease.in_elastic(t) -&gt; number</span></span>
<span class="line"><span>    Apply in_elastic easing.</span></span>
<span class="line"><span>mt.ease.out_elastic(t) -&gt; number</span></span>
<span class="line"><span>    Apply out_elastic easing.</span></span>
<span class="line"><span>mt.ease.in_out_elastic(t) -&gt; number</span></span>
<span class="line"><span>    Apply in_out_elastic easing.</span></span>
<span class="line"><span>mt.ease.in_bounce(t) -&gt; number</span></span>
<span class="line"><span>    Apply in_bounce easing.</span></span>
<span class="line"><span>mt.ease.out_bounce(t) -&gt; number</span></span>
<span class="line"><span>    Apply out_bounce easing.</span></span>
<span class="line"><span>mt.ease.in_out_bounce(t) -&gt; number</span></span>
<span class="line"><span>    Apply in_out_bounce easing.</span></span>
<span class="line"><span>mt.ease.cubic_bezier(x1, y1, x2, y2, t) -&gt; number</span></span>
<span class="line"><span>    Apply a CSS-compatible cubic Bezier easing curve.</span></span></code></pre></div><h3 id="mt-layout" tabindex="-1">mt.layout.* <a class="header-anchor" href="#mt-layout" aria-label="Permalink to &quot;mt.layout.*&quot;">​</a></h3><div class="language-text vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">text</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>mt.layout.reflow(ctx, gap?, config?) -&gt; void</span></span>
<span class="line"><span>    Reflows characters from exact horizontal or vertical typesetting origins while preserving shaped spacing and applying current scale/stretch; skipped targets contribute advances without being moved. (since API level 2)</span></span>
<span class="line"><span>mt.layout.place_2d(ctx, item, canvasX, canvasY) -&gt; number, number</span></span>
<span class="line"><span>    Places a character or part anchor at an exact pre-3D canvas point through the complete global/character/part 2D hierarchy. (since API level 2)</span></span>
<span class="line"><span>mt.layout.get_canvas_position_2d(ctx, item) -&gt; number, number</span></span>
<span class="line"><span>    Calculates the exact current pre-3D canvas position (canvasX, canvasY) of a character or part anchor. (since API level 3)</span></span>
<span class="line"><span>mt.layout.radial_distance(ctx, canvasX, canvasY, centerX?, centerY?) -&gt; number</span></span>
<span class="line"><span>    Aspect-corrected distance from a canvas point to the centre of a radial effect. (since API level 3)</span></span>
<span class="line"><span>mt.layout.canvas_to_offset_2d(ctx, item, canvasX, canvasY) -&gt; number, number</span></span>
<span class="line"><span>    Calculates the relative offset_x and offset_y required to place a character or part anchor at an exact pre-3D canvas position (canvasX, canvasY) without mutating item properties. (since API level 3)</span></span>
<span class="line"><span>mt.layout.measure_bounds_2d(ctx, targets, targetType?) -&gt; table|nil</span></span>
<span class="line"><span>    Returns axis-aligned bounds of transformed natural part boxes after the complete 2D hierarchy and before 3D, projection, and deformation. (since API level 2)</span></span>
<span class="line"><span>mt.layout.queue_on_path(ctx, path, options?) -&gt; number[]</span></span>
<span class="line"><span>    Distributes characters or parts along an arc-length path in reading order, spaced by their own natural advances, and returns the normalized distance ratio each item occupies. (since API level 3)</span></span>
<span class="line"><span>mt.layout.group_by_line(ctx) -&gt; MtLayoutLineGroup[]</span></span>
<span class="line"><span>    Groups shaped characters by line_index in reading order; vertical-writing lines represent columns. (since API level 4)</span></span>
<span class="line"><span>mt.layout.pivot_at_2d(ctx, item, anchor) -&gt; void</span></span>
<span class="line"><span>    Sets a semantic 2D bounds or writing-origin pivot on a character or part while preserving its current pre-3D pose. (since API level 4)</span></span>
<span class="line"><span>mt.layout.retypeset(ctx, gap?, config?) -&gt; void</span></span>
<span class="line"><span>    Deprecated approximate re-typesetting; use reflow. DEPRECATED.</span></span>
<span class="line"><span>mt.layout.canvas_to_offset(resolvedGlobal, canvasWidth, canvasHeight, naturalCenterX, naturalCenterY, canvasX, canvasY) -&gt; number, number</span></span>
<span class="line"><span>    Deprecated global-only inverse conversion; use place_2d. DEPRECATED.</span></span>
<span class="line"><span>mt.layout.set_canvas_position(item, canvasX, canvasY, ctx?) -&gt; number, number</span></span>
<span class="line"><span>    Deprecated partial canvas placement; use place_2d. DEPRECATED.</span></span>
<span class="line"><span>mt.layout.group_bounds(ctx, targets, targetType?) -&gt; table|nil</span></span>
<span class="line"><span>    Deprecated approximate bounds; use measure_bounds_2d. DEPRECATED.</span></span></code></pre></div><h3 id="mt-path" tabindex="-1">mt.path.* <a class="header-anchor" href="#mt-path" aria-label="Permalink to &quot;mt.path.*&quot;">​</a></h3><div class="language-text vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">text</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>mt.path.bezier(p0, p1, p2, p3, t) -&gt; number, number, number, number</span></span>
<span class="line"><span>    Evaluates a point and its tangent (raw derivative, not normalized) on a cubic Bezier curve defined by 4 control points.</span></span>
<span class="line"><span>mt.path.catmull_rom(points, t) -&gt; number, number, number, number</span></span>
<span class="line"><span>    Evaluates a point and its tangent (raw derivative, not normalized) on a Catmull-Rom spline through an array of points; t is normalized over the whole path (0 at the first point, 1 at the last).</span></span>
<span class="line"><span>mt.path.arc_length(points, aspectRatio?, options?) -&gt; MtArcLengthPath</span></span>
<span class="line"><span>    Builds an arc-length parameterized path from control points so items can be placed by distance instead of by curve parameter t. Returns an MtArcLengthPath exposing length() and at_distance(distanceRatio). (since API level 3)</span></span></code></pre></div><h3 id="path" tabindex="-1">path:* <a class="header-anchor" href="#path" aria-label="Permalink to &quot;path:*&quot;">​</a></h3><div class="language-text vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">text</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>path:length() -&gt; number</span></span>
<span class="line"><span>    Total path length in aspect-corrected canvas units. Called with a colon, as path:length(). (since API level 3)</span></span>
<span class="line"><span>path:at_distance(distanceRatio) -&gt; number, number, number</span></span>
<span class="line"><span>    Position and heading at a normalized distance along the path, where 0 is the start and 1 is the end, measured by distance rather than by curve parameter. Returns x, y, and a heading in degrees already converted to the screen convention. Called with a colon, as path:at_distance(ratio). (since API level 3)</span></span></code></pre></div><h3 id="mt-timeline" tabindex="-1">mt.timeline.* <a class="header-anchor" href="#mt-timeline" aria-label="Permalink to &quot;mt.timeline.*&quot;">​</a></h3><div class="language-text vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">text</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>mt.timeline.progress(ctx, fallbackDuration?) -&gt; number</span></span>
<span class="line"><span>    Returns the host timeline progress, falling back to a looping progress if unavailable.</span></span>
<span class="line"><span>mt.timeline.remaining(ctx, fallbackDuration?) -&gt; number</span></span>
<span class="line"><span>    Remaining seconds until the clip end, using a looping fallback duration when the host timeline is unavailable.</span></span>
<span class="line"><span>mt.timeline.intro_outro_seconds(ctx, introSeconds, outroSeconds, fallbackDuration?) -&gt; number, number</span></span>
<span class="line"><span>    Real-time intro and outro progress anchored to the clip head and tail, compressed proportionally when the clip is shorter than the requested seconds.</span></span>
<span class="line"><span>mt.timeline.chain(ctx, initialValue, segments, options?) -&gt; any</span></span>
<span class="line"><span>    Evaluates duration-based pure-function segments with a segment-local context, passing each completed segment&#39;s final return value to the next and supporting fixed or remaining-span holds. (since API level 4)</span></span>
<span class="line"><span>mt.timeline.window_ctx(ctx, start, duration) -&gt; table</span></span>
<span class="line"><span>    Creates a derived context whose time, frame, duration, and progress are remapped to a clamped local time window. (since API level 4)</span></span>
<span class="line"><span>mt.timeline.intro_outro(progress, introFraction, outroFraction) -&gt; number, number</span></span>
<span class="line"><span>    Deprecated: fraction-based transitions stretch with the clip length; use intro_outro_seconds. DEPRECATED.</span></span></code></pre></div><h3 id="mt-text" tabindex="-1">mt.text.* <a class="header-anchor" href="#mt-text" aria-label="Permalink to &quot;mt.text.*&quot;">​</a></h3><div class="language-text vp-adaptive-theme"><button title="Copy Code" class="copy"></button><span class="lang">text</span><pre class="shiki shiki-themes github-light github-dark vp-code" tabindex="0"><code><span class="line"><span>mt.text.slice(text, startChar, endChar?) -&gt; string</span></span>
<span class="line"><span>    Slice a UTF-8 string by code-point indices; this is not grapheme-cluster aware.</span></span>
<span class="line"><span>mt.text.classify(text) -&gt; string</span></span>
<span class="line"><span>    Classifies the first Unicode code point of a text cluster as Japanese script, punctuation, Latin, digit, space, or other. (since API level 4)</span></span></code></pre></div>`,172)])])}const g=s(i,[["render",p]]);export{u as __pageData,g as default};
