
(function(l, r) { if (!l || l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (self.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(self.document);
var app = (function () {
    'use strict';

    function noop() { }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    let src_url_equal_anchor;
    function src_url_equal(element_src, url) {
        if (!src_url_equal_anchor) {
            src_url_equal_anchor = document.createElement('a');
        }
        src_url_equal_anchor.href = url;
        return element_src === src_url_equal_anchor.href;
    }
    function is_empty(obj) {
        return Object.keys(obj).length === 0;
    }

    const globals = (typeof window !== 'undefined'
        ? window
        : typeof globalThis !== 'undefined'
            ? globalThis
            : global);
    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        if (node.parentNode) {
            node.parentNode.removeChild(node);
        }
    }
    function destroy_each(iterations, detaching) {
        for (let i = 0; i < iterations.length; i += 1) {
            if (iterations[i])
                iterations[i].d(detaching);
        }
    }
    function element(name) {
        return document.createElement(name);
    }
    function svg_element(name) {
        return document.createElementNS('http://www.w3.org/2000/svg', name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function set_input_value(input, value) {
        input.value = value == null ? '' : value;
    }
    function custom_event(type, detail, { bubbles = false, cancelable = false } = {}) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, bubbles, cancelable, detail);
        return e;
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }
    function get_current_component() {
        if (!current_component)
            throw new Error('Function called outside component initialization');
        return current_component;
    }
    /**
     * The `onMount` function schedules a callback to run as soon as the component has been mounted to the DOM.
     * It must be called during the component's initialisation (but doesn't need to live *inside* the component;
     * it can be called from an external module).
     *
     * `onMount` does not run inside a [server-side component](/docs#run-time-server-side-component-api).
     *
     * https://svelte.dev/docs#run-time-svelte-onmount
     */
    function onMount(fn) {
        get_current_component().$$.on_mount.push(fn);
    }

    const dirty_components = [];
    const binding_callbacks = [];
    let render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = /* @__PURE__ */ Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    // flush() calls callbacks in this order:
    // 1. All beforeUpdate callbacks, in order: parents before children
    // 2. All bind:this callbacks, in reverse order: children before parents.
    // 3. All afterUpdate callbacks, in order: parents before children. EXCEPT
    //    for afterUpdates called during the initial onMount, which are called in
    //    reverse order: children before parents.
    // Since callbacks might update component values, which could trigger another
    // call to flush(), the following steps guard against this:
    // 1. During beforeUpdate, any updated components will be added to the
    //    dirty_components array and will cause a reentrant call to flush(). Because
    //    the flush index is kept outside the function, the reentrant call will pick
    //    up where the earlier call left off and go through all dirty components. The
    //    current_component value is saved and restored so that the reentrant call will
    //    not interfere with the "parent" flush() call.
    // 2. bind:this callbacks cannot trigger new flush() calls.
    // 3. During afterUpdate, any updated components will NOT have their afterUpdate
    //    callback called a second time; the seen_callbacks set, outside the flush()
    //    function, guarantees this behavior.
    const seen_callbacks = new Set();
    let flushidx = 0; // Do *not* move this inside the flush() function
    function flush() {
        // Do not reenter flush while dirty components are updated, as this can
        // result in an infinite loop. Instead, let the inner flush handle it.
        // Reentrancy is ok afterwards for bindings etc.
        if (flushidx !== 0) {
            return;
        }
        const saved_component = current_component;
        do {
            // first, call beforeUpdate functions
            // and update components
            try {
                while (flushidx < dirty_components.length) {
                    const component = dirty_components[flushidx];
                    flushidx++;
                    set_current_component(component);
                    update(component.$$);
                }
            }
            catch (e) {
                // reset dirty state to not end up in a deadlocked state and then rethrow
                dirty_components.length = 0;
                flushidx = 0;
                throw e;
            }
            set_current_component(null);
            dirty_components.length = 0;
            flushidx = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        seen_callbacks.clear();
        set_current_component(saved_component);
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }
    /**
     * Useful for example to execute remaining `afterUpdate` callbacks before executing `destroy`.
     */
    function flush_render_callbacks(fns) {
        const filtered = [];
        const targets = [];
        render_callbacks.forEach((c) => fns.indexOf(c) === -1 ? filtered.push(c) : targets.push(c));
        targets.forEach((c) => c());
        render_callbacks = filtered;
    }
    const outroing = new Set();
    let outros;
    function group_outros() {
        outros = {
            r: 0,
            c: [],
            p: outros // parent group
        };
    }
    function check_outros() {
        if (!outros.r) {
            run_all(outros.c);
        }
        outros = outros.p;
    }
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function transition_out(block, local, detach, callback) {
        if (block && block.o) {
            if (outroing.has(block))
                return;
            outroing.add(block);
            outros.c.push(() => {
                outroing.delete(block);
                if (callback) {
                    if (detach)
                        block.d(1);
                    callback();
                }
            });
            block.o(local);
        }
        else if (callback) {
            callback();
        }
    }
    function create_component(block) {
        block && block.c();
    }
    function mount_component(component, target, anchor, customElement) {
        const { fragment, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        if (!customElement) {
            // onMount happens before the initial afterUpdate
            add_render_callback(() => {
                const new_on_destroy = component.$$.on_mount.map(run).filter(is_function);
                // if the component was destroyed immediately
                // it will update the `$$.on_destroy` reference to `null`.
                // the destructured on_destroy may still reference to the old array
                if (component.$$.on_destroy) {
                    component.$$.on_destroy.push(...new_on_destroy);
                }
                else {
                    // Edge case - component was destroyed immediately,
                    // most likely as a result of a binding initialising
                    run_all(new_on_destroy);
                }
                component.$$.on_mount = [];
            });
        }
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            flush_render_callbacks($$.after_update);
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, append_styles, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const $$ = component.$$ = {
            fragment: null,
            ctx: [],
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            on_disconnect: [],
            before_update: [],
            after_update: [],
            context: new Map(options.context || (parent_component ? parent_component.$$.context : [])),
            // everything else
            callbacks: blank_object(),
            dirty,
            skip_bound: false,
            root: options.target || parent_component.$$.root
        };
        append_styles && append_styles($$.root);
        let ready = false;
        $$.ctx = instance
            ? instance(component, options.props || {}, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if (!$$.skip_bound && $$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                const nodes = children(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor, options.customElement);
            flush();
        }
        set_current_component(parent_component);
    }
    /**
     * Base class for Svelte components. Used when dev=false.
     */
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            if (!is_function(callback)) {
                return noop;
            }
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set($$props) {
            if (this.$$set && !is_empty($$props)) {
                this.$$.skip_bound = true;
                this.$$set($$props);
                this.$$.skip_bound = false;
            }
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.59.2' }, detail), { bubbles: true }));
    }
    function append_dev(target, node) {
        dispatch_dev('SvelteDOMInsert', { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev('SvelteDOMInsert', { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev('SvelteDOMRemove', { node });
        detach(node);
    }
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation, has_stop_immediate_propagation) {
        const modifiers = options === true ? ['capture'] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        if (has_stop_immediate_propagation)
            modifiers.push('stopImmediatePropagation');
        dispatch_dev('SvelteDOMAddEventListener', { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev('SvelteDOMRemoveEventListener', { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev('SvelteDOMRemoveAttribute', { node, attribute });
        else
            dispatch_dev('SvelteDOMSetAttribute', { node, attribute, value });
    }
    function prop_dev(node, property, value) {
        node[property] = value;
        dispatch_dev('SvelteDOMSetProperty', { node, property, value });
    }
    function set_data_dev(text, data) {
        data = '' + data;
        if (text.data === data)
            return;
        dispatch_dev('SvelteDOMSetData', { node: text, data });
        text.data = data;
    }
    function validate_each_argument(arg) {
        if (typeof arg !== 'string' && !(arg && typeof arg === 'object' && 'length' in arg)) {
            let msg = '{#each} only iterates over array-like objects.';
            if (typeof Symbol === 'function' && arg && Symbol.iterator in arg) {
                msg += ' You can use a spread to convert this iterable into an array.';
            }
            throw new Error(msg);
        }
    }
    function validate_slots(name, slot, keys) {
        for (const slot_key of Object.keys(slot)) {
            if (!~keys.indexOf(slot_key)) {
                console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
            }
        }
    }
    /**
     * Base class for Svelte components with some minor dev-enhancements. Used when dev=true.
     */
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error("'target' is a required option");
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn('Component was already destroyed'); // eslint-disable-line no-console
            };
        }
        $capture_state() { }
        $inject_state() { }
    }

    /* src/components/Toast.svelte generated by Svelte v3.59.2 */

    const file$1 = "src/components/Toast.svelte";

    // (31:37) 
    function create_if_block_2$1(ctx) {
    	let svg;
    	let path;
    	let svg_class_value;

    	const block = {
    		c: function create() {
    			svg = svg_element("svg");
    			path = svg_element("path");
    			attr_dev(path, "stroke-linecap", "round");
    			attr_dev(path, "stroke-linejoin", "round");
    			attr_dev(path, "stroke-width", "2");
    			attr_dev(path, "d", "M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z");
    			add_location(path, file$1, 32, 14, 1515);
    			attr_dev(svg, "class", svg_class_value = `h-6 w-6 ${/*iconClasses*/ ctx[3][/*type*/ ctx[1]]}`);
    			attr_dev(svg, "xmlns", "http://www.w3.org/2000/svg");
    			attr_dev(svg, "fill", "none");
    			attr_dev(svg, "viewBox", "0 0 24 24");
    			attr_dev(svg, "stroke", "currentColor");
    			add_location(svg, file$1, 31, 12, 1367);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, svg, anchor);
    			append_dev(svg, path);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*type*/ 2 && svg_class_value !== (svg_class_value = `h-6 w-6 ${/*iconClasses*/ ctx[3][/*type*/ ctx[1]]}`)) {
    				attr_dev(svg, "class", svg_class_value);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(svg);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_2$1.name,
    		type: "if",
    		source: "(31:37) ",
    		ctx
    	});

    	return block;
    }

    // (27:39) 
    function create_if_block_1$1(ctx) {
    	let svg;
    	let path;
    	let svg_class_value;

    	const block = {
    		c: function create() {
    			svg = svg_element("svg");
    			path = svg_element("path");
    			attr_dev(path, "stroke-linecap", "round");
    			attr_dev(path, "stroke-linejoin", "round");
    			attr_dev(path, "stroke-width", "2");
    			attr_dev(path, "d", "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z");
    			add_location(path, file$1, 28, 14, 1175);
    			attr_dev(svg, "class", svg_class_value = `h-6 w-6 ${/*iconClasses*/ ctx[3][/*type*/ ctx[1]]}`);
    			attr_dev(svg, "xmlns", "http://www.w3.org/2000/svg");
    			attr_dev(svg, "fill", "none");
    			attr_dev(svg, "viewBox", "0 0 24 24");
    			attr_dev(svg, "stroke", "currentColor");
    			add_location(svg, file$1, 27, 12, 1027);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, svg, anchor);
    			append_dev(svg, path);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*type*/ 2 && svg_class_value !== (svg_class_value = `h-6 w-6 ${/*iconClasses*/ ctx[3][/*type*/ ctx[1]]}`)) {
    				attr_dev(svg, "class", svg_class_value);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(svg);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1$1.name,
    		type: "if",
    		source: "(27:39) ",
    		ctx
    	});

    	return block;
    }

    // (23:10) {#if type === 'info'}
    function create_if_block$1(ctx) {
    	let svg;
    	let path;
    	let svg_class_value;

    	const block = {
    		c: function create() {
    			svg = svg_element("svg");
    			path = svg_element("path");
    			attr_dev(path, "stroke-linecap", "round");
    			attr_dev(path, "stroke-linejoin", "round");
    			attr_dev(path, "stroke-width", "2");
    			attr_dev(path, "d", "M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z");
    			add_location(path, file$1, 24, 14, 821);
    			attr_dev(svg, "class", svg_class_value = `h-6 w-6 ${/*iconClasses*/ ctx[3][/*type*/ ctx[1]]}`);
    			attr_dev(svg, "xmlns", "http://www.w3.org/2000/svg");
    			attr_dev(svg, "fill", "none");
    			attr_dev(svg, "viewBox", "0 0 24 24");
    			attr_dev(svg, "stroke", "currentColor");
    			add_location(svg, file$1, 23, 12, 673);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, svg, anchor);
    			append_dev(svg, path);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*type*/ 2 && svg_class_value !== (svg_class_value = `h-6 w-6 ${/*iconClasses*/ ctx[3][/*type*/ ctx[1]]}`)) {
    				attr_dev(svg, "class", svg_class_value);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(svg);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$1.name,
    		type: "if",
    		source: "(23:10) {#if type === 'info'}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$1(ctx) {
    	let div6;
    	let div5;
    	let div4;
    	let div3;
    	let div0;
    	let t0;
    	let div1;
    	let p;
    	let t1;
    	let t2;
    	let div2;
    	let button;
    	let svg;
    	let path;
    	let button_class_value;
    	let div5_class_value;
    	let mounted;
    	let dispose;

    	function select_block_type(ctx, dirty) {
    		if (/*type*/ ctx[1] === 'info') return create_if_block$1;
    		if (/*type*/ ctx[1] === 'success') return create_if_block_1$1;
    		if (/*type*/ ctx[1] === 'error') return create_if_block_2$1;
    	}

    	let current_block_type = select_block_type(ctx);
    	let if_block = current_block_type && current_block_type(ctx);

    	const block = {
    		c: function create() {
    			div6 = element("div");
    			div5 = element("div");
    			div4 = element("div");
    			div3 = element("div");
    			div0 = element("div");
    			if (if_block) if_block.c();
    			t0 = space();
    			div1 = element("div");
    			p = element("p");
    			t1 = text(/*message*/ ctx[0]);
    			t2 = space();
    			div2 = element("div");
    			button = element("button");
    			svg = svg_element("svg");
    			path = svg_element("path");
    			attr_dev(div0, "class", "flex-shrink-0");
    			add_location(div0, file$1, 21, 8, 601);
    			attr_dev(p, "class", "text-sm font-medium");
    			add_location(p, file$1, 37, 10, 1759);
    			attr_dev(div1, "class", "ml-3 w-0 flex-1");
    			add_location(div1, file$1, 36, 8, 1719);
    			attr_dev(path, "fill-rule", "evenodd");
    			attr_dev(path, "d", "M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z");
    			attr_dev(path, "clip-rule", "evenodd");
    			add_location(path, file$1, 44, 14, 2114);
    			attr_dev(svg, "class", "h-5 w-5");
    			attr_dev(svg, "xmlns", "http://www.w3.org/2000/svg");
    			attr_dev(svg, "viewBox", "0 0 20 20");
    			attr_dev(svg, "fill", "currentColor");
    			add_location(svg, file$1, 43, 12, 2003);
    			attr_dev(button, "class", button_class_value = `inline-flex ${/*iconClasses*/ ctx[3][/*type*/ ctx[1]]}`);
    			add_location(button, file$1, 42, 10, 1899);
    			attr_dev(div2, "class", "ml-4 flex-shrink-0 flex");
    			add_location(div2, file$1, 41, 8, 1851);
    			attr_dev(div3, "class", "flex items-start");
    			add_location(div3, file$1, 20, 6, 562);
    			attr_dev(div4, "class", "p-4");
    			add_location(div4, file$1, 19, 4, 538);
    			attr_dev(div5, "class", div5_class_value = `max-w-sm w-full shadow-lg rounded-lg pointer-events-auto ${/*typeClasses*/ ctx[2][/*type*/ ctx[1]]}`);
    			add_location(div5, file$1, 18, 2, 440);
    			attr_dev(div6, "class", "fixed inset-x-0 top-4 flex items-center justify-center z-50 px-4");
    			add_location(div6, file$1, 17, 0, 359);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div6, anchor);
    			append_dev(div6, div5);
    			append_dev(div5, div4);
    			append_dev(div4, div3);
    			append_dev(div3, div0);
    			if (if_block) if_block.m(div0, null);
    			append_dev(div3, t0);
    			append_dev(div3, div1);
    			append_dev(div1, p);
    			append_dev(p, t1);
    			append_dev(div3, t2);
    			append_dev(div3, div2);
    			append_dev(div2, button);
    			append_dev(button, svg);
    			append_dev(svg, path);

    			if (!mounted) {
    				dispose = listen_dev(button, "click", /*click_handler*/ ctx[4], false, false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (current_block_type === (current_block_type = select_block_type(ctx)) && if_block) {
    				if_block.p(ctx, dirty);
    			} else {
    				if (if_block) if_block.d(1);
    				if_block = current_block_type && current_block_type(ctx);

    				if (if_block) {
    					if_block.c();
    					if_block.m(div0, null);
    				}
    			}

    			if (dirty & /*message*/ 1) set_data_dev(t1, /*message*/ ctx[0]);

    			if (dirty & /*type*/ 2 && button_class_value !== (button_class_value = `inline-flex ${/*iconClasses*/ ctx[3][/*type*/ ctx[1]]}`)) {
    				attr_dev(button, "class", button_class_value);
    			}

    			if (dirty & /*type*/ 2 && div5_class_value !== (div5_class_value = `max-w-sm w-full shadow-lg rounded-lg pointer-events-auto ${/*typeClasses*/ ctx[2][/*type*/ ctx[1]]}`)) {
    				attr_dev(div5, "class", div5_class_value);
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div6);

    			if (if_block) {
    				if_block.d();
    			}

    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$1.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$1($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Toast', slots, []);
    	let { message } = $$props;
    	let { type = 'info' } = $$props;

    	const typeClasses = {
    		info: 'bg-blue-50 text-blue-800',
    		success: 'bg-green-50 text-green-800',
    		error: 'bg-red-50 text-red-800'
    	};

    	const iconClasses = {
    		info: 'text-blue-400',
    		success: 'text-green-400',
    		error: 'text-red-400'
    	};

    	$$self.$$.on_mount.push(function () {
    		if (message === undefined && !('message' in $$props || $$self.$$.bound[$$self.$$.props['message']])) {
    			console.warn("<Toast> was created without expected prop 'message'");
    		}
    	});

    	const writable_props = ['message', 'type'];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Toast> was created with unknown prop '${key}'`);
    	});

    	const click_handler = () => {
    		showToast = false;
    	};

    	$$self.$$set = $$props => {
    		if ('message' in $$props) $$invalidate(0, message = $$props.message);
    		if ('type' in $$props) $$invalidate(1, type = $$props.type);
    	};

    	$$self.$capture_state = () => ({ message, type, typeClasses, iconClasses });

    	$$self.$inject_state = $$props => {
    		if ('message' in $$props) $$invalidate(0, message = $$props.message);
    		if ('type' in $$props) $$invalidate(1, type = $$props.type);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [message, type, typeClasses, iconClasses, click_handler];
    }

    class Toast extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, { message: 0, type: 1 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Toast",
    			options,
    			id: create_fragment$1.name
    		});
    	}

    	get message() {
    		throw new Error("<Toast>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set message(value) {
    		throw new Error("<Toast>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get type() {
    		throw new Error("<Toast>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set type(value) {
    		throw new Error("<Toast>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/App.svelte generated by Svelte v3.59.2 */

    const { Error: Error_1 } = globals;
    const file = "src/App.svelte";

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[15] = list[i];
    	return child_ctx;
    }

    // (110:4) {#if showToast}
    function create_if_block_5(ctx) {
    	let toast;
    	let current;

    	toast = new Toast({
    			props: {
    				message: /*toastMessage*/ ctx[6],
    				type: /*toastType*/ ctx[7]
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(toast.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(toast, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const toast_changes = {};
    			if (dirty & /*toastMessage*/ 64) toast_changes.message = /*toastMessage*/ ctx[6];
    			if (dirty & /*toastType*/ 128) toast_changes.type = /*toastType*/ ctx[7];
    			toast.$set(toast_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(toast.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(toast.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(toast, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_5.name,
    		type: "if",
    		source: "(110:4) {#if showToast}",
    		ctx
    	});

    	return block;
    }

    // (217:45) 
    function create_if_block_4(ctx) {
    	let div5;
    	let div4;
    	let div0;
    	let svg;
    	let path;
    	let t0;
    	let h30;
    	let t2;
    	let p0;
    	let t4;
    	let div3;
    	let div2;
    	let div1;
    	let h31;
    	let t6;
    	let p1;
    	let a;
    	let t7;
    	let t8;
    	let button;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			div5 = element("div");
    			div4 = element("div");
    			div0 = element("div");
    			svg = svg_element("svg");
    			path = svg_element("path");
    			t0 = space();
    			h30 = element("h3");
    			h30.textContent = "Deployment Successful!";
    			t2 = space();
    			p0 = element("p");
    			p0.textContent = "Your application is now ready to use.";
    			t4 = space();
    			div3 = element("div");
    			div2 = element("div");
    			div1 = element("div");
    			h31 = element("h3");
    			h31.textContent = "Your application URL:";
    			t6 = space();
    			p1 = element("p");
    			a = element("a");
    			t7 = text(/*deploymentUrl*/ ctx[3]);
    			t8 = space();
    			button = element("button");
    			button.textContent = "Deploy Another Application";
    			attr_dev(path, "stroke-linecap", "round");
    			attr_dev(path, "stroke-linejoin", "round");
    			attr_dev(path, "stroke-width", "2");
    			attr_dev(path, "d", "M5 13l4 4L19 7");
    			add_location(path, file, 221, 14, 7984);
    			attr_dev(svg, "class", "h-6 w-6 text-green-600");
    			attr_dev(svg, "xmlns", "http://www.w3.org/2000/svg");
    			attr_dev(svg, "fill", "none");
    			attr_dev(svg, "viewBox", "0 0 24 24");
    			attr_dev(svg, "stroke", "currentColor");
    			add_location(svg, file, 220, 12, 7844);
    			attr_dev(div0, "class", "mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4");
    			add_location(div0, file, 219, 10, 7736);
    			attr_dev(h30, "class", "text-lg font-medium text-gray-900 mb-1");
    			add_location(h30, file, 224, 10, 8122);
    			attr_dev(p0, "class", "text-sm text-gray-500 mb-4");
    			add_location(p0, file, 225, 10, 8211);
    			attr_dev(h31, "class", "text-sm font-medium text-gray-800");
    			add_location(h31, file, 230, 16, 8444);
    			attr_dev(a, "href", /*deploymentUrl*/ ctx[3]);
    			attr_dev(a, "target", "_blank");
    			attr_dev(a, "rel", "noopener noreferrer");
    			attr_dev(a, "class", "font-bold hover:underline");
    			add_location(a, file, 232, 18, 8600);
    			attr_dev(p1, "class", "mt-2 text-sm text-blue-700 break-all");
    			add_location(p1, file, 231, 16, 8533);
    			attr_dev(div1, "class", "ml-3 w-full");
    			add_location(div1, file, 229, 14, 8402);
    			attr_dev(div2, "class", "flex");
    			add_location(div2, file, 228, 12, 8369);
    			attr_dev(div3, "class", "rounded-md bg-gray-50 p-4 mb-4");
    			add_location(div3, file, 227, 10, 8312);
    			attr_dev(button, "type", "button");
    			attr_dev(button, "class", "inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500");
    			add_location(button, file, 240, 10, 8859);
    			attr_dev(div4, "class", "text-center");
    			add_location(div4, file, 218, 8, 7700);
    			attr_dev(div5, "class", "bg-white py-8 px-6 shadow rounded-lg sm:px-10 mb-6");
    			add_location(div5, file, 217, 6, 7627);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div5, anchor);
    			append_dev(div5, div4);
    			append_dev(div4, div0);
    			append_dev(div0, svg);
    			append_dev(svg, path);
    			append_dev(div4, t0);
    			append_dev(div4, h30);
    			append_dev(div4, t2);
    			append_dev(div4, p0);
    			append_dev(div4, t4);
    			append_dev(div4, div3);
    			append_dev(div3, div2);
    			append_dev(div2, div1);
    			append_dev(div1, h31);
    			append_dev(div1, t6);
    			append_dev(div1, p1);
    			append_dev(p1, a);
    			append_dev(a, t7);
    			append_dev(div4, t8);
    			append_dev(div4, button);

    			if (!mounted) {
    				dispose = listen_dev(button, "click", /*click_handler_1*/ ctx[13], false, false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*deploymentUrl*/ 8) set_data_dev(t7, /*deploymentUrl*/ ctx[3]);

    			if (dirty & /*deploymentUrl*/ 8) {
    				attr_dev(a, "href", /*deploymentUrl*/ ctx[3]);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div5);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_4.name,
    		type: "if",
    		source: "(217:45) ",
    		ctx
    	});

    	return block;
    }

    // (186:84) 
    function create_if_block_2(ctx) {
    	let div2;
    	let div1;
    	let div0;
    	let t0;
    	let h3;

    	let t1_value = (/*deploymentStatus*/ ctx[2] === 'validating'
    	? 'Validating your request...'
    	: 'Deploying your application...') + "";

    	let t1;
    	let t2;
    	let p;

    	let t3_value = (/*deploymentStatus*/ ctx[2] === 'validating'
    	? 'Checking if your username is available.'
    	: 'This may take a few minutes. Please don\'t close this window.') + "";

    	let t3;
    	let t4;
    	let if_block = /*deploymentStatus*/ ctx[2] === 'deploying' && create_if_block_3(ctx);

    	const block = {
    		c: function create() {
    			div2 = element("div");
    			div1 = element("div");
    			div0 = element("div");
    			t0 = space();
    			h3 = element("h3");
    			t1 = text(t1_value);
    			t2 = space();
    			p = element("p");
    			t3 = text(t3_value);
    			t4 = space();
    			if (if_block) if_block.c();
    			attr_dev(div0, "class", "animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4");
    			add_location(div0, file, 188, 10, 6292);
    			attr_dev(h3, "class", "text-lg font-medium text-gray-900 mb-1");
    			add_location(h3, file, 189, 10, 6398);
    			attr_dev(p, "class", "text-sm text-gray-500");
    			add_location(p, file, 192, 10, 6589);
    			attr_dev(div1, "class", "text-center");
    			add_location(div1, file, 187, 8, 6256);
    			attr_dev(div2, "class", "bg-white py-8 px-6 shadow rounded-lg sm:px-10 mb-6");
    			add_location(div2, file, 186, 6, 6183);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div2, anchor);
    			append_dev(div2, div1);
    			append_dev(div1, div0);
    			append_dev(div1, t0);
    			append_dev(div1, h3);
    			append_dev(h3, t1);
    			append_dev(div1, t2);
    			append_dev(div1, p);
    			append_dev(p, t3);
    			append_dev(div1, t4);
    			if (if_block) if_block.m(div1, null);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*deploymentStatus*/ 4 && t1_value !== (t1_value = (/*deploymentStatus*/ ctx[2] === 'validating'
    			? 'Validating your request...'
    			: 'Deploying your application...') + "")) set_data_dev(t1, t1_value);

    			if (dirty & /*deploymentStatus*/ 4 && t3_value !== (t3_value = (/*deploymentStatus*/ ctx[2] === 'validating'
    			? 'Checking if your username is available.'
    			: 'This may take a few minutes. Please don\'t close this window.') + "")) set_data_dev(t3, t3_value);

    			if (/*deploymentStatus*/ ctx[2] === 'deploying') {
    				if (if_block) ; else {
    					if_block = create_if_block_3(ctx);
    					if_block.c();
    					if_block.m(div1, null);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div2);
    			if (if_block) if_block.d();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_2.name,
    		type: "if",
    		source: "(186:84) ",
    		ctx
    	});

    	return block;
    }

    // (119:4) {#if deploymentStatus === 'idle' || deploymentStatus === 'error'}
    function create_if_block(ctx) {
    	let div5;
    	let form;
    	let div1;
    	let label0;
    	let t1;
    	let div0;
    	let input;
    	let t2;
    	let p;
    	let t4;
    	let div3;
    	let label1;
    	let t6;
    	let div2;
    	let t7;
    	let div4;
    	let button;
    	let t8;
    	let button_disabled_value;
    	let t9;
    	let mounted;
    	let dispose;
    	let each_value = /*apps*/ ctx[8];
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    	}

    	let if_block = /*deploymentStatus*/ ctx[2] === 'error' && create_if_block_1(ctx);

    	const block = {
    		c: function create() {
    			div5 = element("div");
    			form = element("form");
    			div1 = element("div");
    			label0 = element("label");
    			label0.textContent = "Username";
    			t1 = space();
    			div0 = element("div");
    			input = element("input");
    			t2 = space();
    			p = element("p");
    			p.textContent = "This will be used for your subdomain: username.ex-lab.de";
    			t4 = space();
    			div3 = element("div");
    			label1 = element("label");
    			label1.textContent = "Select Application";
    			t6 = space();
    			div2 = element("div");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t7 = space();
    			div4 = element("div");
    			button = element("button");
    			t8 = text("Deploy Application");
    			t9 = space();
    			if (if_block) if_block.c();
    			attr_dev(label0, "for", "username");
    			attr_dev(label0, "class", "block text-sm font-medium text-gray-700");
    			add_location(label0, file, 122, 12, 3247);
    			attr_dev(input, "id", "username");
    			attr_dev(input, "name", "username");
    			attr_dev(input, "type", "text");
    			input.required = true;
    			attr_dev(input, "class", "appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm");
    			attr_dev(input, "placeholder", "Choose a unique username (3-30 characters)");
    			add_location(input, file, 124, 14, 3379);
    			attr_dev(div0, "class", "mt-1");
    			add_location(div0, file, 123, 12, 3346);
    			attr_dev(p, "class", "mt-1 text-xs text-gray-500");
    			add_location(p, file, 134, 12, 3860);
    			add_location(div1, file, 121, 10, 3229);
    			attr_dev(label1, "class", "block text-sm font-medium text-gray-700 mb-2");
    			add_location(label1, file, 138, 12, 4015);
    			attr_dev(div2, "class", "grid grid-cols-1 gap-4 sm:grid-cols-2");
    			add_location(div2, file, 139, 12, 4114);
    			add_location(div3, file, 137, 10, 3997);
    			attr_dev(button, "type", "button");
    			attr_dev(button, "class", "w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500");
    			button.disabled = button_disabled_value = !/*username*/ ctx[0] || !/*selectedApp*/ ctx[1];
    			add_location(button, file, 161, 12, 5152);
    			add_location(div4, file, 160, 10, 5134);
    			attr_dev(form, "class", "mb-0 space-y-6");
    			add_location(form, file, 120, 8, 3189);
    			attr_dev(div5, "class", "bg-white py-8 px-6 shadow rounded-lg sm:px-10 mb-6");
    			add_location(div5, file, 119, 6, 3116);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div5, anchor);
    			append_dev(div5, form);
    			append_dev(form, div1);
    			append_dev(div1, label0);
    			append_dev(div1, t1);
    			append_dev(div1, div0);
    			append_dev(div0, input);
    			set_input_value(input, /*username*/ ctx[0]);
    			append_dev(div1, t2);
    			append_dev(div1, p);
    			append_dev(form, t4);
    			append_dev(form, div3);
    			append_dev(div3, label1);
    			append_dev(div3, t6);
    			append_dev(div3, div2);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				if (each_blocks[i]) {
    					each_blocks[i].m(div2, null);
    				}
    			}

    			append_dev(form, t7);
    			append_dev(form, div4);
    			append_dev(div4, button);
    			append_dev(button, t8);
    			append_dev(form, t9);
    			if (if_block) if_block.m(form, null);

    			if (!mounted) {
    				dispose = [
    					listen_dev(input, "input", /*input_input_handler*/ ctx[11]),
    					listen_dev(button, "click", /*deployApp*/ ctx[10], false, false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*username*/ 1 && input.value !== /*username*/ ctx[0]) {
    				set_input_value(input, /*username*/ ctx[0]);
    			}

    			if (dirty & /*selectedApp, apps, selectApp*/ 770) {
    				each_value = /*apps*/ ctx[8];
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(div2, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}

    			if (dirty & /*username, selectedApp*/ 3 && button_disabled_value !== (button_disabled_value = !/*username*/ ctx[0] || !/*selectedApp*/ ctx[1])) {
    				prop_dev(button, "disabled", button_disabled_value);
    			}

    			if (/*deploymentStatus*/ ctx[2] === 'error') {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    				} else {
    					if_block = create_if_block_1(ctx);
    					if_block.c();
    					if_block.m(form, null);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div5);
    			destroy_each(each_blocks, detaching);
    			if (if_block) if_block.d();
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block.name,
    		type: "if",
    		source: "(119:4) {#if deploymentStatus === 'idle' || deploymentStatus === 'error'}",
    		ctx
    	});

    	return block;
    }

    // (199:10) {#if deploymentStatus === 'deploying'}
    function create_if_block_3(ctx) {
    	let div5;
    	let div4;
    	let div1;
    	let div0;
    	let span;
    	let t1;
    	let div3;
    	let div2;

    	const block = {
    		c: function create() {
    			div5 = element("div");
    			div4 = element("div");
    			div1 = element("div");
    			div0 = element("div");
    			span = element("span");
    			span.textContent = "Deployment in progress";
    			t1 = space();
    			div3 = element("div");
    			div2 = element("div");
    			attr_dev(span, "class", "text-xs font-semibold inline-block py-1 px-2 uppercase rounded-full text-blue-600 bg-blue-200");
    			add_location(span, file, 203, 20, 7072);
    			add_location(div0, file, 202, 18, 7046);
    			attr_dev(div1, "class", "flex mb-2 items-center justify-between");
    			add_location(div1, file, 201, 16, 6975);
    			attr_dev(div2, "class", "w-full bg-blue-500 animate-pulse h-full");
    			add_location(div2, file, 209, 18, 7408);
    			attr_dev(div3, "class", "overflow-hidden h-2 mb-4 text-xs flex rounded bg-blue-200");
    			add_location(div3, file, 208, 16, 7318);
    			attr_dev(div4, "class", "relative pt-1");
    			add_location(div4, file, 200, 14, 6931);
    			attr_dev(div5, "class", "mt-6");
    			add_location(div5, file, 199, 12, 6898);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div5, anchor);
    			append_dev(div5, div4);
    			append_dev(div4, div1);
    			append_dev(div1, div0);
    			append_dev(div0, span);
    			append_dev(div4, t1);
    			append_dev(div4, div3);
    			append_dev(div3, div2);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div5);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_3.name,
    		type: "if",
    		source: "(199:10) {#if deploymentStatus === 'deploying'}",
    		ctx
    	});

    	return block;
    }

    // (141:14) {#each apps as app}
    function create_each_block(ctx) {
    	let button;
    	let div2;
    	let div0;
    	let img;
    	let img_src_value;
    	let t0;
    	let div1;
    	let p0;
    	let t1_value = /*app*/ ctx[15].name + "";
    	let t1;
    	let t2;
    	let p1;
    	let t3_value = /*app*/ ctx[15].description + "";
    	let t3;
    	let t4;
    	let button_class_value;
    	let mounted;
    	let dispose;

    	function click_handler() {
    		return /*click_handler*/ ctx[12](/*app*/ ctx[15]);
    	}

    	const block = {
    		c: function create() {
    			button = element("button");
    			div2 = element("div");
    			div0 = element("div");
    			img = element("img");
    			t0 = space();
    			div1 = element("div");
    			p0 = element("p");
    			t1 = text(t1_value);
    			t2 = space();
    			p1 = element("p");
    			t3 = text(t3_value);
    			t4 = space();
    			if (!src_url_equal(img.src, img_src_value = /*app*/ ctx[15].icon)) attr_dev(img, "src", img_src_value);
    			attr_dev(img, "alt", /*app*/ ctx[15].name);
    			attr_dev(img, "class", "h-10 w-10");
    			add_location(img, file, 148, 22, 4684);
    			attr_dev(div0, "class", "flex-shrink-0");
    			add_location(div0, file, 147, 20, 4634);
    			attr_dev(p0, "class", "text-base font-medium text-gray-900");
    			add_location(p0, file, 151, 22, 4838);
    			attr_dev(p1, "class", "text-sm text-gray-500");
    			add_location(p1, file, 152, 22, 4922);
    			attr_dev(div1, "class", "ml-4 text-left");
    			add_location(div1, file, 150, 20, 4787);
    			attr_dev(div2, "class", "flex items-center");
    			add_location(div2, file, 146, 18, 4582);
    			attr_dev(button, "type", "button");

    			attr_dev(button, "class", button_class_value = `relative block p-4 border ${/*selectedApp*/ ctx[1]?.id === /*app*/ ctx[15].id
			? 'border-blue-500 ring-2 ring-blue-500'
			: 'border-gray-300'} rounded-lg shadow-sm hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500`);

    			add_location(button, file, 141, 16, 4216);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, button, anchor);
    			append_dev(button, div2);
    			append_dev(div2, div0);
    			append_dev(div0, img);
    			append_dev(div2, t0);
    			append_dev(div2, div1);
    			append_dev(div1, p0);
    			append_dev(p0, t1);
    			append_dev(div1, t2);
    			append_dev(div1, p1);
    			append_dev(p1, t3);
    			append_dev(button, t4);

    			if (!mounted) {
    				dispose = listen_dev(button, "click", click_handler, false, false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;

    			if (dirty & /*selectedApp*/ 2 && button_class_value !== (button_class_value = `relative block p-4 border ${/*selectedApp*/ ctx[1]?.id === /*app*/ ctx[15].id
			? 'border-blue-500 ring-2 ring-blue-500'
			: 'border-gray-300'} rounded-lg shadow-sm hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500`)) {
    				attr_dev(button, "class", button_class_value);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(button);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block.name,
    		type: "each",
    		source: "(141:14) {#each apps as app}",
    		ctx
    	});

    	return block;
    }

    // (172:10) {#if deploymentStatus === 'error'}
    function create_if_block_1(ctx) {
    	let div3;
    	let div2;
    	let div1;
    	let h3;
    	let t1;
    	let div0;
    	let p;
    	let t2;

    	const block = {
    		c: function create() {
    			div3 = element("div");
    			div2 = element("div");
    			div1 = element("div");
    			h3 = element("h3");
    			h3.textContent = "Deployment Error";
    			t1 = space();
    			div0 = element("div");
    			p = element("p");
    			t2 = text(/*errorMessage*/ ctx[4]);
    			attr_dev(h3, "class", "text-sm font-medium text-red-800");
    			add_location(h3, file, 175, 18, 5792);
    			add_location(p, file, 177, 20, 5937);
    			attr_dev(div0, "class", "mt-2 text-sm text-red-700");
    			add_location(div0, file, 176, 18, 5877);
    			attr_dev(div1, "class", "ml-3");
    			add_location(div1, file, 174, 16, 5755);
    			attr_dev(div2, "class", "flex");
    			add_location(div2, file, 173, 14, 5720);
    			attr_dev(div3, "class", "rounded-md bg-red-50 p-4");
    			add_location(div3, file, 172, 12, 5667);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div3, anchor);
    			append_dev(div3, div2);
    			append_dev(div2, div1);
    			append_dev(div1, h3);
    			append_dev(div1, t1);
    			append_dev(div1, div0);
    			append_dev(div0, p);
    			append_dev(p, t2);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*errorMessage*/ 16) set_data_dev(t2, /*errorMessage*/ ctx[4]);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div3);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1.name,
    		type: "if",
    		source: "(172:10) {#if deploymentStatus === 'error'}",
    		ctx
    	});

    	return block;
    }

    function create_fragment(ctx) {
    	let t0;
    	let main;
    	let div2;
    	let t1;
    	let div0;
    	let h1;
    	let t3;
    	let p0;
    	let t5;
    	let t6;
    	let div1;
    	let p1;
    	let t8;
    	let p2;
    	let current;
    	let if_block0 = /*showToast*/ ctx[5] && create_if_block_5(ctx);

    	function select_block_type(ctx, dirty) {
    		if (/*deploymentStatus*/ ctx[2] === 'idle' || /*deploymentStatus*/ ctx[2] === 'error') return create_if_block;
    		if (/*deploymentStatus*/ ctx[2] === 'validating' || /*deploymentStatus*/ ctx[2] === 'deploying') return create_if_block_2;
    		if (/*deploymentStatus*/ ctx[2] === 'success') return create_if_block_4;
    	}

    	let current_block_type = select_block_type(ctx);
    	let if_block1 = current_block_type && current_block_type(ctx);

    	const block = {
    		c: function create() {
    			t0 = text("// App.svelte - Main application component\n\n\n\n");
    			main = element("main");
    			div2 = element("div");
    			if (if_block0) if_block0.c();
    			t1 = space();
    			div0 = element("div");
    			h1 = element("h1");
    			h1.textContent = "Data Sandbox Deployer";
    			t3 = space();
    			p0 = element("p");
    			p0.textContent = "Deploy your own data analytics platform with one click";
    			t5 = space();
    			if (if_block1) if_block1.c();
    			t6 = space();
    			div1 = element("div");
    			p1 = element("p");
    			p1.textContent = "GDPR-compliant analytics platform for German non-profits";
    			t8 = space();
    			p2 = element("p");
    			p2.textContent = "All data is stored on German servers (Hetzner)";
    			attr_dev(h1, "class", "text-3xl font-bold text-gray-900");
    			add_location(h1, file, 114, 6, 2857);
    			attr_dev(p0, "class", "mt-2 text-gray-600");
    			add_location(p0, file, 115, 6, 2935);
    			attr_dev(div0, "class", "text-center mb-8");
    			add_location(div0, file, 113, 4, 2820);
    			add_location(p1, file, 252, 6, 9355);
    			attr_dev(p2, "class", "mt-1");
    			add_location(p2, file, 253, 6, 9425);
    			attr_dev(div1, "class", "text-center text-xs text-gray-500");
    			add_location(div1, file, 251, 4, 9301);
    			attr_dev(div2, "class", "max-w-lg mx-auto");
    			add_location(div2, file, 108, 2, 2694);
    			attr_dev(main, "class", "min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8");
    			add_location(main, file, 107, 0, 2626);
    		},
    		l: function claim(nodes) {
    			throw new Error_1("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t0, anchor);
    			insert_dev(target, main, anchor);
    			append_dev(main, div2);
    			if (if_block0) if_block0.m(div2, null);
    			append_dev(div2, t1);
    			append_dev(div2, div0);
    			append_dev(div0, h1);
    			append_dev(div0, t3);
    			append_dev(div0, p0);
    			append_dev(div2, t5);
    			if (if_block1) if_block1.m(div2, null);
    			append_dev(div2, t6);
    			append_dev(div2, div1);
    			append_dev(div1, p1);
    			append_dev(div1, t8);
    			append_dev(div1, p2);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			if (/*showToast*/ ctx[5]) {
    				if (if_block0) {
    					if_block0.p(ctx, dirty);

    					if (dirty & /*showToast*/ 32) {
    						transition_in(if_block0, 1);
    					}
    				} else {
    					if_block0 = create_if_block_5(ctx);
    					if_block0.c();
    					transition_in(if_block0, 1);
    					if_block0.m(div2, t1);
    				}
    			} else if (if_block0) {
    				group_outros();

    				transition_out(if_block0, 1, 1, () => {
    					if_block0 = null;
    				});

    				check_outros();
    			}

    			if (current_block_type === (current_block_type = select_block_type(ctx)) && if_block1) {
    				if_block1.p(ctx, dirty);
    			} else {
    				if (if_block1) if_block1.d(1);
    				if_block1 = current_block_type && current_block_type(ctx);

    				if (if_block1) {
    					if_block1.c();
    					if_block1.m(div2, t6);
    				}
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block0);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block0);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t0);
    			if (detaching) detach_dev(main);
    			if (if_block0) if_block0.d();

    			if (if_block1) {
    				if_block1.d();
    			}
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function validateUsername(username) {
    	const pattern = /^[a-zA-Z0-9_]{3,30}$/;
    	return pattern.test(username);
    }

    function instance($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('App', slots, []);
    	let username = '';
    	let selectedApp = null;
    	let deploymentStatus = 'idle'; // idle, validating, deploying, success, error
    	let deploymentUrl = '';
    	let errorMessage = '';
    	let showToast = false;
    	let toastMessage = '';
    	let toastType = 'info'; // info, success, error

    	// Available applications
    	const apps = [
    		{
    			id: 'metabase',
    			name: 'Metabase',
    			description: 'Easy-to-use analytics and visualization tool',
    			icon: '/icons/metabase.svg'
    		},
    		{
    			id: 'superset',
    			name: 'Apache Superset',
    			description: 'Modern data exploration and visualization platform',
    			icon: '/icons/superset.svg'
    		}
    	];

    	// Display toast notification
    	function showNotification(message, type = 'info') {
    		$$invalidate(6, toastMessage = message);
    		$$invalidate(7, toastType = type);
    		$$invalidate(5, showToast = true);

    		setTimeout(
    			() => {
    				$$invalidate(5, showToast = false);
    			},
    			5000
    		);
    	}

    	// Handle app selection
    	function selectApp(app) {
    		$$invalidate(1, selectedApp = app);
    	}

    	// Handle deployment
    	async function deployApp() {
    		if (!validateUsername(username)) {
    			showNotification('Username must be 3-30 alphanumeric characters or underscores', 'error');
    			return;
    		}

    		if (!selectedApp) {
    			showNotification('Please select an application to deploy', 'error');
    			return;
    		}

    		$$invalidate(2, deploymentStatus = 'deploying');

    		try {
    			const response = await fetch('https://dashboard.ex-lab.de/deploy', {
    				method: 'POST',
    				headers: { 'Content-Type': 'application/json' },
    				body: JSON.stringify({
    					projectName: username,
    					appType: selectedApp.id
    				})
    			});

    			const data = await response.json();

    			if (!response.ok || !data.success) {
    				throw new Error(data.error || data.stderr || 'Deployment failed');
    			}

    			$$invalidate(3, deploymentUrl = data.url);
    			$$invalidate(2, deploymentStatus = 'success');
    			localStorage.setItem('username', username);
    			showNotification('Deployment successful!', 'success');
    		} catch(error) {
    			$$invalidate(2, deploymentStatus = 'error');
    			$$invalidate(4, errorMessage = error.message);
    			showNotification(`Deployment failed: ${error.message}`, 'error');
    		}
    	}

    	// Load saved username on mount
    	onMount(() => {
    		const savedUsername = localStorage.getItem('username');

    		if (savedUsername) {
    			$$invalidate(0, username = savedUsername);
    		}
    	});

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	function input_input_handler() {
    		username = this.value;
    		$$invalidate(0, username);
    	}

    	const click_handler = app => selectApp(app);
    	const click_handler_1 = () => $$invalidate(2, deploymentStatus = 'idle');

    	$$self.$capture_state = () => ({
    		onMount,
    		Toast,
    		username,
    		selectedApp,
    		deploymentStatus,
    		deploymentUrl,
    		errorMessage,
    		showToast,
    		toastMessage,
    		toastType,
    		apps,
    		validateUsername,
    		showNotification,
    		selectApp,
    		deployApp
    	});

    	$$self.$inject_state = $$props => {
    		if ('username' in $$props) $$invalidate(0, username = $$props.username);
    		if ('selectedApp' in $$props) $$invalidate(1, selectedApp = $$props.selectedApp);
    		if ('deploymentStatus' in $$props) $$invalidate(2, deploymentStatus = $$props.deploymentStatus);
    		if ('deploymentUrl' in $$props) $$invalidate(3, deploymentUrl = $$props.deploymentUrl);
    		if ('errorMessage' in $$props) $$invalidate(4, errorMessage = $$props.errorMessage);
    		if ('showToast' in $$props) $$invalidate(5, showToast = $$props.showToast);
    		if ('toastMessage' in $$props) $$invalidate(6, toastMessage = $$props.toastMessage);
    		if ('toastType' in $$props) $$invalidate(7, toastType = $$props.toastType);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		username,
    		selectedApp,
    		deploymentStatus,
    		deploymentUrl,
    		errorMessage,
    		showToast,
    		toastMessage,
    		toastType,
    		apps,
    		selectApp,
    		deployApp,
    		input_input_handler,
    		click_handler,
    		click_handler_1
    	];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment.name
    		});
    	}
    }

    const app = new App({
      target: document.body
    });

    return app;

})();
//# sourceMappingURL=bundle.js.map
