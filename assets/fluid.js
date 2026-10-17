/* Amin-inspired homepage experiment, adapted from Inspira UI FluidCursor.vue.
 * Licensed source: unovue/inspira-ui @ 04c57ab62b9713872ebbf68988dff1836ed3d764
 * Source path: app/components/inspira/ui/fluid-cursor/FluidCursor.vue
 * Reference study: amin-nepali/amin-nepali @ 626aea086b9c2f5aa7ae294571dd2c78563465aa
 * Only the licensed solver is adapted; Vue/portfolio code is not included.
 * Zyberlane integration: fixed red, trusted movement, bounded resolution,
 * one animation loop, passive touch and explicit graphics/listener cleanup.
 *
 * MIT License
 *
 * Copyright (c) 2024-2026 rahulv.dev
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */
(() => {
  'use strict';
  const byId = id => document.getElementById(id);
  let canvas = byId('fluid');
  if (!canvas) return;
  const homeMode = canvas.dataset.fluidHome === '';
  canvas.dataset.fluidVariant = 'amin-inspired';
  const text = (element, value) => { if (element) element.textContent = value; };
  const status = byId('status');
  const engine = byId('engine');
  const metrics = byId('metrics');
  const input = byId('input');
  const health = byId('health');
  const pauseButton = byId('pause');
  const burstButton = byId('burst');
  const clearButton = byId('clear');
  const ambient = byId('ambient') || { checked: true };
  const quality = byId('quality') || { value: 'auto' };
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const coarse = matchMedia('(pointer: coarse)');
  const pointers = new Map();
  const pending = [];
  let errorCount = 0, frameCount = 0, moveCount = 0, splatCount = 0;
  let lastInput = 'none';
  let paused = motion.matches, lost = false, failed = false;
  let raf = 0, lastTime = 0, elapsed = 0, lastAmbient = 0, lastMetrics = 0;
  let sampleFrames = 0, sampleTime = 0, adaptiveLow = false;
  let gpu = null;
  let cpu = null;
  let initialized = false, homeReady = !homeMode, boundInputTarget = null;

  let destroyed = false, pageObserver;
  const cleanups = [], inputCleanups = [], canvasCleanups = [];
  function listen(target, type, listener, options, group = cleanups) {
    target.addEventListener(type, listener, options);
    group.push(() => target.removeEventListener?.(type, listener, options));
  }
  function onWindow(type, listener, options) {
    addEventListener(type, listener, options);
    cleanups.push(() => { if (typeof removeEventListener === 'function') removeEventListener(type, listener, options); });
  }
  function destroy() {
    if (destroyed) return;
    destroyed = true; stop(); pageObserver?.disconnect();
    for (const group of [inputCleanups, canvasCleanups, cleanups]) for (const remove of group.splice(0)) remove();
    gpu?.dispose(); gpu = null;
    cpu = null;
  }

  function reportError(message) {
    errorCount++;
    text(health, `Runtime errors: ${errorCount} · ${String(message).slice(0, 140)}`);
    canvas.dataset.fluidErrors = String(errorCount);
  }
  onWindow('error', event => reportError(event.message || 'Resource load failed'));
  onWindow('unhandledrejection', event => reportError(event.reason?.message || 'Unhandled promise rejection'));

function createReferenceGPU(canvas) {
    let gl;
    const resources = Object.fromEntries([
        'Texture',
        'Framebuffer',
        'Shader',
        'Program',
        'Buffer'
    ].map((kind)=>[
            kind,
            new Set()
        ]));
    function keep(kind, resource) {
        if (!resource) throw new Error(`Unable to allocate fluid ${kind}`);
        resources[kind].add(resource);
        return resource;
    }
    function releaseFBO(target) {
        gl.deleteFramebuffer(target.fbo);
        resources.Framebuffer.delete(target.fbo);
        gl.deleteTexture(target.texture);
        resources.Texture.delete(target.texture);
    }
    function dispose() {
        if (!gl) return;
        for (const [kind, items] of Object.entries(resources)){
            for (const item of items)gl[`delete${kind}`](item);
            items.clear();
        }
        gl.getExtension('WEBGL_lose_context')?.loseContext?.();
    }
    try {
        const config = {
            SIM_RESOLUTION: 128,
            DYE_RESOLUTION: 1024,
            DENSITY_DISSIPATION: 3.5,
            VELOCITY_DISSIPATION: 2,
            PRESSURE: 0.1,
            PRESSURE_ITERATIONS: 20,
            CURL: 3,
            SPLAT_RADIUS: 0.2,
            SHADING: true
        };
        const { ext } = getWebGLContext(canvas);
        if (!ext.halfFloatTexType || !ext.formatRGBA || !ext.formatRG || !ext.formatR) {
            throw new Error('Floating-point WebGL fluid targets are unavailable');
        }
        function getWebGLContext(canvas) {
            const params = {
                alpha: true,
                depth: false,
                stencil: false,
                antialias: false,
                preserveDrawingBuffer: false
            };
            gl = canvas.getContext("webgl2", params);
            if (!gl) {
                gl = canvas.getContext("webgl", params) || canvas.getContext("experimental-webgl", params);
            }
            if (!gl) {
                throw new Error("Unable to initialize WebGL.");
            }
            const isWebGL2 = "drawBuffers" in gl;
            let supportLinearFiltering = false;
            let halfFloat = null;
            if (isWebGL2) {
                gl.getExtension("EXT_color_buffer_float");
                supportLinearFiltering = !!gl.getExtension("OES_texture_float_linear");
            } else {
                halfFloat = gl.getExtension("OES_texture_half_float");
                supportLinearFiltering = !!gl.getExtension("OES_texture_half_float_linear");
            }
            gl.clearColor(0, 0, 0, 0);
            const halfFloatTexType = isWebGL2 ? gl.HALF_FLOAT : halfFloat && halfFloat.HALF_FLOAT_OES || 0;
            let formatRGBA;
            let formatRG;
            let formatR;
            if (isWebGL2) {
                formatRGBA = getSupportedFormat(gl, gl.RGBA16F, gl.RGBA, halfFloatTexType);
                formatRG = getSupportedFormat(gl, gl.RG16F, gl.RG, halfFloatTexType);
                formatR = getSupportedFormat(gl, gl.R16F, gl.RED, halfFloatTexType);
            } else {
                formatRGBA = getSupportedFormat(gl, gl.RGBA, gl.RGBA, halfFloatTexType);
                formatRG = getSupportedFormat(gl, gl.RGBA, gl.RGBA, halfFloatTexType);
                formatR = getSupportedFormat(gl, gl.RGBA, gl.RGBA, halfFloatTexType);
            }
            return {
                gl,
                ext: {
                    formatRGBA,
                    formatRG,
                    formatR,
                    halfFloatTexType,
                    supportLinearFiltering
                }
            };
        }
        function getSupportedFormat(gl, internalFormat, format, type) {
            if (!supportRenderTextureFormat(gl, internalFormat, format, type)) {
                if ("drawBuffers" in gl) {
                    const gl2 = gl;
                    switch(internalFormat){
                        case gl2.R16F:
                            return getSupportedFormat(gl2, gl2.RG16F, gl2.RG, type);
                        case gl2.RG16F:
                            return getSupportedFormat(gl2, gl2.RGBA16F, gl2.RGBA, type);
                        default:
                            return null;
                    }
                }
                return null;
            }
            return {
                internalFormat,
                format
            };
        }
        function supportRenderTextureFormat(gl, internalFormat, format, type) {
            const texture = gl.createTexture(), fbo = gl.createFramebuffer();
            try {
                if (!texture || !fbo || !type) return false;
                gl.bindTexture(gl.TEXTURE_2D, texture);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
                gl.texImage2D(gl.TEXTURE_2D, 0, internalFormat, 4, 4, 0, format, type, null);
                gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
                gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
                return gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE;
            } finally{
                if (fbo) gl.deleteFramebuffer(fbo);
                if (texture) gl.deleteTexture(texture);
                gl.bindFramebuffer(gl.FRAMEBUFFER, null);
            }
        }
        function hashCode(s) {
            if (!s.length) return 0;
            let hash = 0;
            for(let i = 0; i < s.length; i++){
                hash = (hash << 5) - hash + s.charCodeAt(i);
                hash |= 0;
            }
            return hash;
        }
        function addKeywords(source, keywords) {
            if (!keywords) return source;
            let keywordsString = "";
            for (const keyword of keywords){
                keywordsString += `#define ${keyword}\n`;
            }
            return keywordsString + source;
        }
        function compileShader(type, source, keywords = null) {
            const shaderSource = addKeywords(source, keywords);
            const shader = keep("Shader", gl.createShader(type));
            if (!shader) return null;
            gl.shaderSource(shader, shaderSource);
            gl.compileShader(shader);
            if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
                throw new Error(gl.getShaderInfoLog(shader) || 'Fluid shader compilation failed');
            }
            return shader;
        }
        function createProgram(vertexShader, fragmentShader) {
            if (!vertexShader || !fragmentShader) return null;
            const program = keep("Program", gl.createProgram());
            if (!program) return null;
            gl.attachShader(program, vertexShader);
            gl.attachShader(program, fragmentShader);
            gl.bindAttribLocation(program, 0, 'aPosition');
            gl.linkProgram(program);
            if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
                throw new Error(gl.getProgramInfoLog(program) || 'Fluid shader linking failed');
            }
            return program;
        }
        function getUniforms(program) {
            const uniforms = {};
            const uniformCount = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS);
            for(let i = 0; i < uniformCount; i++){
                const uniformInfo = gl.getActiveUniform(program, i);
                if (uniformInfo) {
                    uniforms[uniformInfo.name] = gl.getUniformLocation(program, uniformInfo.name);
                }
            }
            return uniforms;
        }
        class Program {
            program;
            uniforms;
            constructor(vertexShader, fragmentShader){
                this.program = createProgram(vertexShader, fragmentShader);
                this.uniforms = this.program ? getUniforms(this.program) : {};
            }
            bind() {
                if (this.program) gl.useProgram(this.program);
            }
        }
        class Material {
            vertexShader;
            fragmentShaderSource;
            programs;
            activeProgram;
            uniforms;
            constructor(vertexShader, fragmentShaderSource){
                this.vertexShader = vertexShader;
                this.fragmentShaderSource = fragmentShaderSource;
                this.programs = {};
                this.activeProgram = null;
                this.uniforms = {};
            }
            setKeywords(keywords) {
                let hash = 0;
                for (const kw of keywords){
                    hash += hashCode(kw);
                }
                let program = this.programs[hash];
                if (program == null) {
                    const fragmentShader = compileShader(gl.FRAGMENT_SHADER, this.fragmentShaderSource, keywords);
                    program = createProgram(this.vertexShader, fragmentShader);
                    this.programs[hash] = program;
                }
                if (program === this.activeProgram) return;
                if (program) {
                    this.uniforms = getUniforms(program);
                }
                this.activeProgram = program;
            }
            bind() {
                if (this.activeProgram) {
                    gl.useProgram(this.activeProgram);
                }
            }
        }
        const baseVertexShader = compileShader(gl.VERTEX_SHADER, `
        precision highp float;
        attribute vec2 aPosition;
        varying vec2 vUv;
        varying vec2 vL;
        varying vec2 vR;
        varying vec2 vT;
        varying vec2 vB;
        uniform vec2 texelSize;

        void main () {
          vUv = aPosition * 0.5 + 0.5;
          vL = vUv - vec2(texelSize.x, 0.0);
          vR = vUv + vec2(texelSize.x, 0.0);
          vT = vUv + vec2(0.0, texelSize.y);
          vB = vUv - vec2(0.0, texelSize.y);
          gl_Position = vec4(aPosition, 0.0, 1.0);
        }
      `);
        const copyShader = compileShader(gl.FRAGMENT_SHADER, `
        precision mediump float;
        precision mediump sampler2D;
        varying highp vec2 vUv;
        uniform sampler2D uTexture;

        void main () {
          gl_FragColor = texture2D(uTexture, vUv);
        }
      `);
        const clearShader = compileShader(gl.FRAGMENT_SHADER, `
        precision mediump float;
        precision mediump sampler2D;
        varying highp vec2 vUv;
        uniform sampler2D uTexture;
        uniform float value;

        void main () {
          gl_FragColor = value * texture2D(uTexture, vUv);
        }
      `);
        const displayShaderSource = `
        precision highp float;
        precision highp sampler2D;
        varying vec2 vUv;
        varying vec2 vL;
        varying vec2 vR;
        varying vec2 vT;
        varying vec2 vB;
        uniform sampler2D uTexture;
        uniform sampler2D uDithering;
        uniform vec2 ditherScale;
        uniform vec2 texelSize;

        vec3 linearToGamma (vec3 color) {
          color = max(color, vec3(0));
          return max(1.055 * pow(color, vec3(0.416666667)) - 0.055, vec3(0));
        }

        void main () {
          vec3 c = texture2D(uTexture, vUv).rgb;
          #ifdef SHADING
            vec3 lc = texture2D(uTexture, vL).rgb;
            vec3 rc = texture2D(uTexture, vR).rgb;
            vec3 tc = texture2D(uTexture, vT).rgb;
            vec3 bc = texture2D(uTexture, vB).rgb;

            float dx = length(rc) - length(lc);
            float dy = length(tc) - length(bc);

            vec3 n = normalize(vec3(dx, dy, length(texelSize)));
            vec3 l = vec3(0.0, 0.0, 1.0);

            float diffuse = clamp(dot(n, l) + 0.7, 0.7, 1.0);
            c *= diffuse;
          #endif

          float a = max(c.r, max(c.g, c.b));
          gl_FragColor = vec4(c, a);
        }
      `;
        const splatShader = compileShader(gl.FRAGMENT_SHADER, `
        precision highp float;
        precision highp sampler2D;
        varying vec2 vUv;
        uniform sampler2D uTarget;
        uniform float aspectRatio;
        uniform vec3 color;
        uniform vec2 point;
        uniform float radius;

        void main () {
          vec2 p = vUv - point.xy;
          p.x *= aspectRatio;
          vec3 splat = exp(-dot(p, p) / radius) * color;
          vec3 base = texture2D(uTarget, vUv).xyz;
          gl_FragColor = vec4(base + splat, 1.0);
        }
      `);
        const advectionShader = compileShader(gl.FRAGMENT_SHADER, `
        precision highp float;
        precision highp sampler2D;
        varying vec2 vUv;
        uniform sampler2D uVelocity;
        uniform sampler2D uSource;
        uniform vec2 texelSize;
        uniform vec2 dyeTexelSize;
        uniform float dt;
        uniform float dissipation;

        vec4 bilerp (sampler2D sam, vec2 uv, vec2 tsize) {
          vec2 st = uv / tsize - 0.5;
          vec2 iuv = floor(st);
          vec2 fuv = fract(st);

          vec4 a = texture2D(sam, (iuv + vec2(0.5, 0.5)) * tsize);
          vec4 b = texture2D(sam, (iuv + vec2(1.5, 0.5)) * tsize);
          vec4 c = texture2D(sam, (iuv + vec2(0.5, 1.5)) * tsize);
          vec4 d = texture2D(sam, (iuv + vec2(1.5, 1.5)) * tsize);

          return mix(mix(a, b, fuv.x), mix(c, d, fuv.x), fuv.y);
        }

        void main () {
          #ifdef MANUAL_FILTERING
            vec2 coord = vUv - dt * bilerp(uVelocity, vUv, texelSize).xy * texelSize;
            vec4 result = bilerp(uSource, coord, dyeTexelSize);
          #else
            vec2 coord = vUv - dt * texture2D(uVelocity, vUv).xy * texelSize;
            vec4 result = texture2D(uSource, coord);
          #endif
          float decay = 1.0 + dissipation * dt;
          gl_FragColor = result / decay;
        }
      `, ext.supportLinearFiltering ? null : [
            "MANUAL_FILTERING"
        ]);
        const divergenceShader = compileShader(gl.FRAGMENT_SHADER, `
        precision mediump float;
        precision mediump sampler2D;
        varying highp vec2 vUv;
        varying highp vec2 vL;
        varying highp vec2 vR;
        varying highp vec2 vT;
        varying highp vec2 vB;
        uniform sampler2D uVelocity;

        void main () {
          float L = texture2D(uVelocity, vL).x;
          float R = texture2D(uVelocity, vR).x;
          float T = texture2D(uVelocity, vT).y;
          float B = texture2D(uVelocity, vB).y;

          vec2 C = texture2D(uVelocity, vUv).xy;
          if (vL.x < 0.0) { L = -C.x; }
          if (vR.x > 1.0) { R = -C.x; }
          if (vT.y > 1.0) { T = -C.y; }
          if (vB.y < 0.0) { B = -C.y; }

          float div = 0.5 * (R - L + T - B);
          gl_FragColor = vec4(div, 0.0, 0.0, 1.0);
        }
      `);
        const curlShader = compileShader(gl.FRAGMENT_SHADER, `
        precision mediump float;
        precision mediump sampler2D;
        varying highp vec2 vUv;
        varying highp vec2 vL;
        varying highp vec2 vR;
        varying highp vec2 vT;
        varying highp vec2 vB;
        uniform sampler2D uVelocity;

        void main () {
          float L = texture2D(uVelocity, vL).y;
          float R = texture2D(uVelocity, vR).y;
          float T = texture2D(uVelocity, vT).x;
          float B = texture2D(uVelocity, vB).x;
          float vorticity = R - L - T + B;
          gl_FragColor = vec4(0.5 * vorticity, 0.0, 0.0, 1.0);
        }
      `);
        const vorticityShader = compileShader(gl.FRAGMENT_SHADER, `
        precision highp float;
        precision highp sampler2D;
        varying vec2 vUv;
        varying vec2 vL;
        varying vec2 vR;
        varying vec2 vT;
        varying vec2 vB;
        uniform sampler2D uVelocity;
        uniform sampler2D uCurl;
        uniform float curl;
        uniform float dt;

        void main () {
          float L = texture2D(uCurl, vL).x;
          float R = texture2D(uCurl, vR).x;
          float T = texture2D(uCurl, vT).x;
          float B = texture2D(uCurl, vB).x;
          float C = texture2D(uCurl, vUv).x;

          vec2 force = 0.5 * vec2(abs(T) - abs(B), abs(R) - abs(L));
          force /= length(force) + 0.0001;
          force *= curl * C;
          force.y *= -1.0;

          vec2 velocity = texture2D(uVelocity, vUv).xy;
          velocity += force * dt;
          velocity = min(max(velocity, -1000.0), 1000.0);
          gl_FragColor = vec4(velocity, 0.0, 1.0);
        }
      `);
        const pressureShader = compileShader(gl.FRAGMENT_SHADER, `
        precision mediump float;
        precision mediump sampler2D;
        varying highp vec2 vUv;
        varying highp vec2 vL;
        varying highp vec2 vR;
        varying highp vec2 vT;
        varying highp vec2 vB;
        uniform sampler2D uPressure;
        uniform sampler2D uDivergence;

        void main () {
          float L = texture2D(uPressure, vL).x;
          float R = texture2D(uPressure, vR).x;
          float T = texture2D(uPressure, vT).x;
          float B = texture2D(uPressure, vB).x;
          float C = texture2D(uPressure, vUv).x;
          float divergence = texture2D(uDivergence, vUv).x;
          float pressure = (L + R + B + T - divergence) * 0.25;
          gl_FragColor = vec4(pressure, 0.0, 0.0, 1.0);
        }
      `);
        const gradientSubtractShader = compileShader(gl.FRAGMENT_SHADER, `
        precision mediump float;
        precision mediump sampler2D;
        varying highp vec2 vUv;
        varying highp vec2 vL;
        varying highp vec2 vR;
        varying highp vec2 vT;
        varying highp vec2 vB;
        uniform sampler2D uPressure;
        uniform sampler2D uVelocity;

        void main () {
          float L = texture2D(uPressure, vL).x;
          float R = texture2D(uPressure, vR).x;
          float T = texture2D(uPressure, vT).x;
          float B = texture2D(uPressure, vB).x;
          vec2 velocity = texture2D(uVelocity, vUv).xy;
          velocity.xy -= vec2(R - L, T - B);
          gl_FragColor = vec4(velocity, 0.0, 1.0);
        }
      `);
        const blit = (()=>{
            const buffer = keep("Buffer", gl.createBuffer());
            gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
                -1,
                -1,
                -1,
                1,
                1,
                1,
                1,
                -1
            ]), gl.STATIC_DRAW);
            const elemBuffer = keep("Buffer", gl.createBuffer());
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, elemBuffer);
            gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array([
                0,
                1,
                2,
                0,
                2,
                3
            ]), gl.STATIC_DRAW);
            gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
            gl.enableVertexAttribArray(0);
            return (target, doClear = false)=>{
                if (!gl) return;
                if (!target) {
                    gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
                    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
                } else {
                    gl.viewport(0, 0, target.width, target.height);
                    gl.bindFramebuffer(gl.FRAMEBUFFER, target.fbo);
                }
                if (doClear) {
                    gl.clearColor(0, 0, 0, 0);
                    gl.clear(gl.COLOR_BUFFER_BIT);
                }
                gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);
            };
        })();
        let dye;
        let velocity;
        let divergence;
        let curl;
        let pressure;
        const copyProgram = new Program(baseVertexShader, copyShader);
        const clearProgram = new Program(baseVertexShader, clearShader);
        const splatProgram = new Program(baseVertexShader, splatShader);
        const advectionProgram = new Program(baseVertexShader, advectionShader);
        const divergenceProgram = new Program(baseVertexShader, divergenceShader);
        const curlProgram = new Program(baseVertexShader, curlShader);
        const vorticityProgram = new Program(baseVertexShader, vorticityShader);
        const pressureProgram = new Program(baseVertexShader, pressureShader);
        const gradienSubtractProgram = new Program(baseVertexShader, gradientSubtractShader);
        const displayMaterial = new Material(baseVertexShader, displayShaderSource);
        function createFBO(w, h, internalFormat, format, type, param) {
            gl.activeTexture(gl.TEXTURE0);
            const texture = keep("Texture", gl.createTexture());
            gl.bindTexture(gl.TEXTURE_2D, texture);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, param);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, param);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
            gl.texImage2D(gl.TEXTURE_2D, 0, internalFormat, w, h, 0, format, type, null);
            const fbo = keep("Framebuffer", gl.createFramebuffer());
            gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
            gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
            if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) {
                throw new Error('Fluid render target is incomplete');
            }
            gl.viewport(0, 0, w, h);
            gl.clear(gl.COLOR_BUFFER_BIT);
            const texelSizeX = 1 / w;
            const texelSizeY = 1 / h;
            return {
                texture,
                fbo,
                width: w,
                height: h,
                texelSizeX,
                texelSizeY,
                attach (id) {
                    gl.activeTexture(gl.TEXTURE0 + id);
                    gl.bindTexture(gl.TEXTURE_2D, texture);
                    return id;
                }
            };
        }
        function createDoubleFBO(w, h, internalFormat, format, type, param) {
            const fbo1 = createFBO(w, h, internalFormat, format, type, param);
            const fbo2 = createFBO(w, h, internalFormat, format, type, param);
            return {
                width: w,
                height: h,
                texelSizeX: fbo1.texelSizeX,
                texelSizeY: fbo1.texelSizeY,
                read: fbo1,
                write: fbo2,
                swap () {
                    const tmp = this.read;
                    this.read = this.write;
                    this.write = tmp;
                }
            };
        }
        function resizeFBO(target, w, h, internalFormat, format, type, param) {
            const newFBO = createFBO(w, h, internalFormat, format, type, param);
            copyProgram.bind();
            if (copyProgram.uniforms.uTexture) gl.uniform1i(copyProgram.uniforms.uTexture, target.attach(0));
            blit(newFBO, false);
            releaseFBO(target);
            return newFBO;
        }
        function resizeDoubleFBO(target, w, h, internalFormat, format, type, param) {
            if (target.width === w && target.height === h) return target;
            target.read = resizeFBO(target.read, w, h, internalFormat, format, type, param);
            releaseFBO(target.write);
            target.write = createFBO(w, h, internalFormat, format, type, param);
            target.width = w;
            target.height = h;
            target.texelSizeX = 1 / w;
            target.texelSizeY = 1 / h;
            return target;
        }
        function initFramebuffers() {
            const simRes = getResolution(config.SIM_RESOLUTION);
            const dyeRes = getResolution(config.DYE_RESOLUTION);
            const texType = ext.halfFloatTexType;
            const rgba = ext.formatRGBA;
            const rg = ext.formatRG;
            const r = ext.formatR;
            const filtering = ext.supportLinearFiltering ? gl.LINEAR : gl.NEAREST;
            gl.disable(gl.BLEND);
            if (!dye) {
                dye = createDoubleFBO(dyeRes.width, dyeRes.height, rgba.internalFormat, rgba.format, texType, filtering);
            } else {
                dye = resizeDoubleFBO(dye, dyeRes.width, dyeRes.height, rgba.internalFormat, rgba.format, texType, filtering);
            }
            if (!velocity) {
                velocity = createDoubleFBO(simRes.width, simRes.height, rg.internalFormat, rg.format, texType, filtering);
            } else {
                velocity = resizeDoubleFBO(velocity, simRes.width, simRes.height, rg.internalFormat, rg.format, texType, filtering);
            }
            if (divergence) releaseFBO(divergence);
            if (curl) releaseFBO(curl);
            if (pressure) {
                releaseFBO(pressure.read);
                releaseFBO(pressure.write);
            }
            divergence = createFBO(simRes.width, simRes.height, r.internalFormat, r.format, texType, gl.NEAREST);
            curl = createFBO(simRes.width, simRes.height, r.internalFormat, r.format, texType, gl.NEAREST);
            pressure = createDoubleFBO(simRes.width, simRes.height, r.internalFormat, r.format, texType, gl.NEAREST);
        }
        function updateKeywords() {
            const displayKeywords = [];
            if (config.SHADING) displayKeywords.push("SHADING");
            displayMaterial.setKeywords(displayKeywords);
        }
        function getResolution(resolution) {
            const w = gl.drawingBufferWidth;
            const h = gl.drawingBufferHeight;
            const aspectRatio = w / h;
            const aspect = Math.min(2.5, aspectRatio < 1 ? 1 / aspectRatio : aspectRatio);
            const min = Math.max(1, Math.round(Math.min(resolution, gl.getParameter(gl.MAX_TEXTURE_SIZE) / aspect)));
            const max = Math.round(resolution * aspect);
            if (w > h) {
                return {
                    width: max,
                    height: min
                };
            }
            return {
                width: min,
                height: max
            };
        }
        function step(dt) {
            gl.disable(gl.BLEND);
            curlProgram.bind();
            if (curlProgram.uniforms.texelSize) {
                gl.uniform2f(curlProgram.uniforms.texelSize, velocity.texelSizeX, velocity.texelSizeY);
            }
            if (curlProgram.uniforms.uVelocity) {
                gl.uniform1i(curlProgram.uniforms.uVelocity, velocity.read.attach(0));
            }
            blit(curl);
            vorticityProgram.bind();
            if (vorticityProgram.uniforms.texelSize) {
                gl.uniform2f(vorticityProgram.uniforms.texelSize, velocity.texelSizeX, velocity.texelSizeY);
            }
            if (vorticityProgram.uniforms.uVelocity) {
                gl.uniform1i(vorticityProgram.uniforms.uVelocity, velocity.read.attach(0));
            }
            if (vorticityProgram.uniforms.uCurl) {
                gl.uniform1i(vorticityProgram.uniforms.uCurl, curl.attach(1));
            }
            if (vorticityProgram.uniforms.curl) {
                gl.uniform1f(vorticityProgram.uniforms.curl, config.CURL);
            }
            if (vorticityProgram.uniforms.dt) {
                gl.uniform1f(vorticityProgram.uniforms.dt, dt);
            }
            blit(velocity.write);
            velocity.swap();
            divergenceProgram.bind();
            if (divergenceProgram.uniforms.texelSize) {
                gl.uniform2f(divergenceProgram.uniforms.texelSize, velocity.texelSizeX, velocity.texelSizeY);
            }
            if (divergenceProgram.uniforms.uVelocity) {
                gl.uniform1i(divergenceProgram.uniforms.uVelocity, velocity.read.attach(0));
            }
            blit(divergence);
            clearProgram.bind();
            if (clearProgram.uniforms.uTexture) {
                gl.uniform1i(clearProgram.uniforms.uTexture, pressure.read.attach(0));
            }
            if (clearProgram.uniforms.value) {
                gl.uniform1f(clearProgram.uniforms.value, config.PRESSURE);
            }
            blit(pressure.write);
            pressure.swap();
            pressureProgram.bind();
            if (pressureProgram.uniforms.texelSize) {
                gl.uniform2f(pressureProgram.uniforms.texelSize, velocity.texelSizeX, velocity.texelSizeY);
            }
            if (pressureProgram.uniforms.uDivergence) {
                gl.uniform1i(pressureProgram.uniforms.uDivergence, divergence.attach(0));
            }
            for(let i = 0; i < config.PRESSURE_ITERATIONS; i++){
                if (pressureProgram.uniforms.uPressure) {
                    gl.uniform1i(pressureProgram.uniforms.uPressure, pressure.read.attach(1));
                }
                blit(pressure.write);
                pressure.swap();
            }
            gradienSubtractProgram.bind();
            if (gradienSubtractProgram.uniforms.texelSize) {
                gl.uniform2f(gradienSubtractProgram.uniforms.texelSize, velocity.texelSizeX, velocity.texelSizeY);
            }
            if (gradienSubtractProgram.uniforms.uPressure) {
                gl.uniform1i(gradienSubtractProgram.uniforms.uPressure, pressure.read.attach(0));
            }
            if (gradienSubtractProgram.uniforms.uVelocity) {
                gl.uniform1i(gradienSubtractProgram.uniforms.uVelocity, velocity.read.attach(1));
            }
            blit(velocity.write);
            velocity.swap();
            advectionProgram.bind();
            if (advectionProgram.uniforms.texelSize) {
                gl.uniform2f(advectionProgram.uniforms.texelSize, velocity.texelSizeX, velocity.texelSizeY);
            }
            if (!ext.supportLinearFiltering && advectionProgram.uniforms.dyeTexelSize) {
                gl.uniform2f(advectionProgram.uniforms.dyeTexelSize, velocity.texelSizeX, velocity.texelSizeY);
            }
            const velocityId = velocity.read.attach(0);
            if (advectionProgram.uniforms.uVelocity) {
                gl.uniform1i(advectionProgram.uniforms.uVelocity, velocityId);
            }
            if (advectionProgram.uniforms.uSource) {
                gl.uniform1i(advectionProgram.uniforms.uSource, velocityId);
            }
            if (advectionProgram.uniforms.dt) {
                gl.uniform1f(advectionProgram.uniforms.dt, dt);
            }
            if (advectionProgram.uniforms.dissipation) {
                gl.uniform1f(advectionProgram.uniforms.dissipation, config.VELOCITY_DISSIPATION);
            }
            blit(velocity.write);
            velocity.swap();
            if (!ext.supportLinearFiltering && advectionProgram.uniforms.dyeTexelSize) {
                gl.uniform2f(advectionProgram.uniforms.dyeTexelSize, dye.texelSizeX, dye.texelSizeY);
            }
            if (advectionProgram.uniforms.uVelocity) {
                gl.uniform1i(advectionProgram.uniforms.uVelocity, velocity.read.attach(0));
            }
            if (advectionProgram.uniforms.uSource) {
                gl.uniform1i(advectionProgram.uniforms.uSource, dye.read.attach(1));
            }
            if (advectionProgram.uniforms.dissipation) {
                gl.uniform1f(advectionProgram.uniforms.dissipation, config.DENSITY_DISSIPATION);
            }
            blit(dye.write);
            dye.swap();
        }
        function render(target) {
            gl.bindFramebuffer(gl.FRAMEBUFFER, null);
            gl.clearColor(0, 0, 0, 0);
            gl.clear(gl.COLOR_BUFFER_BIT);
            gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
            gl.enable(gl.BLEND);
            drawDisplay(target);
        }
        function drawDisplay(target) {
            const width = target ? target.width : gl.drawingBufferWidth;
            const height = target ? target.height : gl.drawingBufferHeight;
            displayMaterial.bind();
            if (config.SHADING && displayMaterial.uniforms.texelSize) {
                gl.uniform2f(displayMaterial.uniforms.texelSize, 1 / width, 1 / height);
            }
            if (displayMaterial.uniforms.uTexture) {
                gl.uniform1i(displayMaterial.uniforms.uTexture, dye.read.attach(0));
            }
            blit(target, false);
        }
        function splat(x, y, dx, dy, color) {
            splatProgram.bind();
            if (splatProgram.uniforms.uTarget) {
                gl.uniform1i(splatProgram.uniforms.uTarget, velocity.read.attach(0));
            }
            if (splatProgram.uniforms.aspectRatio) {
                gl.uniform1f(splatProgram.uniforms.aspectRatio, canvas.width / canvas.height);
            }
            if (splatProgram.uniforms.point) {
                gl.uniform2f(splatProgram.uniforms.point, x, y);
            }
            if (splatProgram.uniforms.color) {
                gl.uniform3f(splatProgram.uniforms.color, dx, dy, 0);
            }
            if (splatProgram.uniforms.radius) {
                gl.uniform1f(splatProgram.uniforms.radius, correctRadius(config.SPLAT_RADIUS / 100));
            }
            blit(velocity.write);
            velocity.swap();
            if (splatProgram.uniforms.uTarget) {
                gl.uniform1i(splatProgram.uniforms.uTarget, dye.read.attach(0));
            }
            if (splatProgram.uniforms.color) {
                gl.uniform3f(splatProgram.uniforms.color, color.r, color.g, color.b);
            }
            blit(dye.write);
            dye.swap();
        }
        function correctRadius(radius) {
            const aspectRatio = canvas.width / canvas.height;
            if (aspectRatio > 1) radius *= aspectRatio;
            return radius;
        }
        return {
            renderer: 'drawBuffers' in gl ? 'webgl2-fluid' : 'webgl-fluid',
            get width () {
                return velocity?.width || 0;
            },
            resize (low, high) {
                config.SIM_RESOLUTION = low ? 96 : 128;
                config.DYE_RESOLUTION = ext.supportLinearFiltering ? high ? 1440 : low ? 512 : 1024 : 256;
                config.SHADING = ext.supportLinearFiltering;
                updateKeywords();
                initFramebuffers();
                return `grid ${velocity.width}×${velocity.height} · dye ${dye.width}×${dye.height}`;
            },
            splat (x, y, dx, dy, strength) {
                const amount = strength * (0.15 / 0.4);
                splat(x, y, dx, dy, {
                    r: amount * 196 / 255,
                    g: amount * 22 / 255,
                    b: amount * 42 / 255
                });
            },
            step (dt) {
                step(Math.min(dt, 1 / 60));
            },
            render () {
                render(null);
            },
            clear () {
                for (const fbo of resources.Framebuffer){
                    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
                    gl.clear(gl.COLOR_BUFFER_BIT);
                }
            },
            dispose
        };
    } catch (error) {
        dispose();
        throw error;
    }
}

  function size(shortSide) {
    const aspect = canvas.width / canvas.height;
    return aspect >= 1 ? [Math.round(shortSide * Math.min(aspect, 2.5)), shortSide]
      : [shortSide, Math.round(shortSide / Math.max(aspect, 0.4))];
  }

  function allocate() {
    const low = quality.value === 'low' || (quality.value === 'auto' && (coarse.matches || adaptiveLow));
    if (cpu) {
      const resolution = quality.value === 'high' ? 152 : low ? (homeMode ? 80 : 96) : (homeMode ? 112 : 128);
      const dimensions = size(resolution);
      cpu.resize(...dimensions, low ? 12 : 16);
      text(engine, `Renderer: Canvas2D fluid · grid ${dimensions.join('×')}${low ? ' · low' : ''}`);
      canvas.dataset.renderer = 'canvas2d-fluid';
      return;
    }
    const dimensions = gpu.resize(low, quality.value === 'high');
    text(engine, `Renderer: Amin-inspired WebGL fluid · ${dimensions}${low ? ' · low' : ''}`);
    canvas.dataset.renderer = gpu.renderer;
  }

  function resize() {
    if ((!gpu && !cpu) || lost || failed) return;
    const ratio = Math.min(devicePixelRatio || 1, coarse.matches ? 1.25 : 1.5);
    const scale = Math.min(ratio, 1920 / Math.max(innerWidth, innerHeight));
    const width = Math.max(1, Math.round(innerWidth * scale));
    const height = Math.max(1, Math.round(innerHeight * scale));
    if (canvas.width === width && canvas.height === height && (gpu?.width || cpu?.width)) return;
    canvas.width = width; canvas.height = height;
    pointers.clear(); pending.length = 0; allocate();
    if (!paused) seed();
    render();
  }

  function splat(x, y, dx, dy, strength = 0.65, radius = 0.00065) {
    if (cpu) { cpu.splat(x, y, dx, dy, strength, radius); splatCount++; return; }
    gpu.splat(x, y, dx, dy, strength); splatCount++;
  }

  function seed() {
    // Demo bursts belong to the lab; homepage allocation/resize must stay empty.
    if (homeMode) return;
    for (let i = 0; i < 7; i++) {
      const angle = i / 7 * Math.PI * 2;
      splat(0.5 + Math.cos(angle) * 0.27 / Math.max(1, canvas.width / canvas.height),
        0.5 + Math.sin(angle) * 0.27, -Math.sin(angle) * 95, Math.cos(angle) * 95, 0.65, 0.0012);
    }
  }

  function step(dt) {
    while (pending.length) splat(...pending.shift());
    if (!homeMode && ambient.checked && elapsed - lastAmbient > 0.12) {
      lastAmbient = elapsed;
      const a = elapsed * 0.26;
      for (const offset of [0, Math.PI]) {
        splat(0.5 + Math.cos(a + offset) * 0.28, 0.5 + Math.sin(a * 1.3 + offset) * 0.22,
          -Math.sin(a + offset) * 16, Math.cos(a * 1.3 + offset) * 20, 0.075, 0.0006);
      }
    }
    if (cpu) cpu.step(dt); else gpu.step(dt);
  }

  function render() {
    if (cpu) cpu.render(); else gpu.render();
  }

  function updateStatus() {
    text(pauseButton, paused ? 'Play' : 'Pause');
    pauseButton?.setAttribute('aria-pressed', String(paused));
    text(status, failed ? 'Fluid unavailable · try another browser' : lost ? 'Graphics interrupted · waiting to restore'
      : paused ? (motion.matches ? 'Reduced motion · press Play to explore' : 'Paused · press Play to continue') : 'Live fluid · move or drag to stir');
    canvas.dataset.state = failed ? 'unavailable' : lost ? 'context-lost' : paused ? 'paused' : 'running';
  }

  function stop() {
    if (raf) cancelAnimationFrame(raf);
    raf = 0; lastTime = 0; pointers.clear(); pending.length = 0;
  }
  function start() {
    if (destroyed || !initialized || !homeReady || raf || paused || lost || failed || document.hidden) return;
    raf = requestAnimationFrame(frame);
  }
  function frame(now) {
    raf = 0;
    if (paused || lost || failed || document.hidden) return;
    const rawDt = lastTime ? (now - lastTime) / 1000 : 1 / 60;
    const dt = Math.min(1 / 30, Math.max(1 / 240, rawDt));
    lastTime = now; elapsed += dt;
    try {
      step(dt); render(); frameCount++; sampleTime += rawDt; sampleFrames++;
      if (now - lastMetrics >= 750) {
        const fps = Math.round(sampleFrames / Math.max(sampleTime, 0.001));
        text(metrics, `Frames: ${frameCount} · ${fps} fps · ${canvas.width}×${canvas.height}`);
        text(input, `Input: ${lastInput} · moves: ${moveCount} · splats: ${splatCount}`);
        if (homeMode) {
          canvas.dataset.fluidFrames = String(frameCount);
          canvas.dataset.fluidInput = lastInput;
          canvas.dataset.fluidMoves = String(moveCount);
          canvas.dataset.fluidSplats = String(splatCount);
          canvas.dataset.fluidFps = String(fps);
        }
        if (frameCount > 150 && quality.value === 'auto' && !adaptiveLow && !coarse.matches && fps < 38) {
          adaptiveLow = true; allocate(); seed();
        }
        sampleTime = 0; sampleFrames = 0; lastMetrics = now;
      }
    } catch (error) {
      if (!cpu) { try { activateFallback(error); } catch (fallbackError) { fail(fallbackError); } }
      else fail(error);
      return;
    }
    start();
  }

  function point(event) {
    const rect = canvas.getBoundingClientRect();
    return { x: (event.clientX - rect.left) / rect.width, y: 1 - (event.clientY - rect.top) / rect.height, time: event.timeStamp };
  }
  function queueStroke(previous, current, touch) {
    const dx = current.x - previous.x, dy = current.y - previous.y;
    if (dx === 0 && dy === 0) return;
    const aspect = canvas.width / canvas.height;
    const forceX = dx * Math.min(1, aspect) * 6000;
    const forceY = dy / Math.max(1, aspect) * 6000;
    const distance = Math.hypot(dx * canvas.width / canvas.height, dy);
    const count = Math.max(1, Math.min(10, Math.ceil(distance / 0.018)));
    // Interpolate sparse events into continuous trails and cap per-frame GPU work.
    for (let i = 1; i <= count; i++) {
      if (pending.length >= 24) pending.shift();
      const t = i / count;
      pending.push([previous.x + dx * t, previous.y + dy * t, forceX, forceY, 0.4, touch ? 0.001 : 0.00065]);
    }
  }
  function bindCanvasEvents() {
    const inputTarget = homeMode ? document : canvas;
    if (boundInputTarget !== inputTarget) {
      for (const remove of inputCleanups.splice(0)) remove();
      boundInputTarget = inputTarget;
      const onInput = (type, listener, options) => listen(inputTarget, type, listener, options, inputCleanups);
      onInput('pointerdown', event => {
        if (homeMode && !event.isTrusted) return;
        if (paused || lost || failed || (event.pointerType === 'mouse' && event.button !== 0)) return;
        if (homeMode && event.pointerType === 'touch') return;
        const current = point(event);
        pointers.set(event.pointerId, current);
        if (!homeMode) {
          try { canvas.setPointerCapture(event.pointerId); } catch { /* Contact may have ended before capture. */ }
        }
        lastInput = event.pointerType || 'mouse';
        if (!homeMode && pending.length < 24) pending.push([current.x, current.y, 0, 30, 0.7, 0.001]);
      }, { passive: true });
      onInput('pointermove', event => {
        if (homeMode && !event.isTrusted) return;
        // Layout/viewport changes can dispatch trusted mouse events without movement.
        if (homeMode && event.pointerType === 'mouse' && event.movementX === 0 && event.movementY === 0) return;
        if (paused || lost || failed) return;
        if (homeMode && event.pointerType === 'touch') return;
        const touch = event.pointerType === 'touch';
        if (event.pointerType !== 'mouse' && !pointers.has(event.pointerId)) return;
        const current = point(event), previous = pointers.get(event.pointerId);
        lastInput = event.pointerType || 'mouse'; moveCount++;
        if (previous && current.time - previous.time < 180) queueStroke(previous, current, touch);
        else if (!homeMode && pending.length < 24) pending.push([current.x, current.y, 0, 12, 0.4, touch ? 0.001 : 0.00065]);
        else if (homeMode && event.pointerType === 'mouse' && (event.movementX || event.movementY)) {
          const rect = canvas.getBoundingClientRect();
          queueStroke({ x: current.x - event.movementX / rect.width, y: current.y + event.movementY / rect.height }, current, false);
        }
        pointers.set(event.pointerId, current);
      }, { passive: true });
      function release(event) { pointers.delete(event.pointerId); }
      for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) onInput(type, release, { passive: true });
      onInput('pointerleave', event => { if (homeMode || !canvas.hasPointerCapture(event.pointerId)) release(event); }, { passive: true });
      if (homeMode) {
        // Passive touch events keep following a finger during native page scrolling.
        // Ignore touch Pointer Events above so each contact is processed once.
        for (const type of ['touchstart', 'touchmove', 'touchend', 'touchcancel']) {
          onInput(type, event => {
            if (!event.isTrusted) return;
            for (const touch of event.changedTouches) {
              const key = `touch:${touch.identifier}`;
              if (type === 'touchend' || type === 'touchcancel') { pointers.delete(key); continue; }
              if (paused || lost || failed) continue;
              const current = point({ clientX: touch.clientX, clientY: touch.clientY, timeStamp: event.timeStamp });
              const previous = pointers.get(key);
              lastInput = 'touch';
              if (type === 'touchmove') {
                if (!previous) continue;
                moveCount++;
                queueStroke(previous, current, true);
              }
              pointers.set(key, current);
            }
          }, { passive: true });
        }
      }
    }
    for (const remove of canvasCleanups.splice(0)) remove();
    listen(canvas, 'webglcontextlost', event => {
      event.preventDefault();
      if (cpu || failed) return;
      try { activateFallback(new Error('GPU context interrupted')); } catch (error) { fail(error); }
    }, undefined, canvasCleanups);
  }
  onWindow('blur', () => { pointers.clear(); pending.length = 0; });

  if (pauseButton) listen(pauseButton, 'click', () => {
    if (failed || lost) return;
    paused = !paused;
    if (paused) stop(); else start();
    updateStatus();
  });
  if (burstButton) listen(burstButton, 'click', () => {
    if (failed || lost) return;
    if (paused) { paused = false; updateStatus(); }
    seed(); render(); start();
  });
  if (clearButton) listen(clearButton, 'click', () => {
    if (failed || lost) return;
    pointers.clear(); pending.length = 0; ambient.checked = false;
    if (cpu) { cpu.clear(); render(); return; }
    gpu.clear();
    render();
  });
  if (quality.addEventListener) listen(quality, 'change', () => {
    if (failed || lost) return;
    try { adaptiveLow = false; allocate(); if (!paused) seed(); render(); }
    catch (error) { fail(error); }
  });
  listen(motion, 'change', event => {
    paused = event.matches;
    if (homeMode) canvas.hidden = paused;
    if (paused) stop(); else { if (!initialized) boot(); start(); }
    updateStatus();
  });
  listen(document, 'visibilitychange', () => { if (document.hidden) stop(); else start(); });
  onWindow('resize', () => { try { resize(); } catch (error) { fail(error); } }, { passive: true });

  function activateFallback(reason) {
    stop();
    for (const remove of canvasCleanups.splice(0)) remove();
    // A canvas that acquired WebGL cannot acquire 2D. Replace the element and
    // rebind its input handlers; otherwise the fallback would fail on this path.
    gpu?.dispose(); gpu = null;
    const replacement = canvas.cloneNode(false);
    canvas.replaceWith(replacement);
    canvas = replacement;
    cpu = new window.ZyberlaneCPUFluid(canvas, homeMode ? { color: [196, 22, 42], background: 0 } : {});
    lost = false; failed = false;
    bindCanvasEvents(); resize(); updateStatus(); start();
    console.info('[Zyberlane fluid] Canvas2D fluid active:', reason.message);
  }

  function fail(error) {
    failed = true; stop(); reportError(error.message);
    text(engine, 'Renderer unavailable · this browser could not initialize graphics');
    for (const control of [pauseButton, burstButton, clearButton, quality, ambient]) if (control) control.disabled = true;
    updateStatus();
    if (homeMode) { canvas.hidden = true; console.warn('[Zyberlane fluid] Atmosphere disabled:', error.message); }
    else console.error('[Zyberlane fluid]', error);
  }
  function initialize() {
    gpu = createReferenceGPU(canvas);
    resize(); updateStatus();
  }
  function boot() {
    if (destroyed || initialized || failed) return;
    initialized = true;
    bindCanvasEvents();
    try { initialize(); start(); }
    catch (error) { try { activateFallback(error); } catch (fallbackError) { fail(fallbackError); } }
  }
  function beginHome() {
    homeReady = true;
    if (motion.matches) { canvas.hidden = true; canvas.dataset.state = 'reduced-motion'; return; }
    boot(); start();
  }
  onWindow('pagehide', event => { if (event.persisted) stop(); else destroy(); });
  onWindow('pageshow', event => { if (event.persisted) start(); });
  if (homeMode) {
    const loader = byId('loadingScreen');
    if (loader && !loader.classList.contains('loading-done') && typeof MutationObserver === 'function') {
      canvas.dataset.state = 'waiting-for-page';
      pageObserver = new MutationObserver(() => {
        if (!loader.classList.contains('loading-done') && loader.isConnected) return;
        pageObserver.disconnect(); beginHome();
      });
      pageObserver.observe(loader, { attributes: true, attributeFilter: ['class'] });
    } else beginHome();
  } else boot();
})();
