
(function(l, r) { if (!l || l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (self.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(self.document);
var app = (function () {
    'use strict';

    function noop() { }
    function assign(tar, src) {
        // @ts-ignore
        for (const k in src)
            tar[k] = src[k];
        return tar;
    }
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
    function subscribe(store, ...callbacks) {
        if (store == null) {
            return noop;
        }
        const unsub = store.subscribe(...callbacks);
        return unsub.unsubscribe ? () => unsub.unsubscribe() : unsub;
    }
    function action_destroyer(action_result) {
        return action_result && is_function(action_result.destroy) ? action_result.destroy : noop;
    }
    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function element(name) {
        return document.createElement(name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function empty() {
        return text('');
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
    function set_style(node, key, value, important) {
        if (value === null) {
            node.style.removeProperty(key);
        }
        else {
            node.style.setProperty(key, value, important ? 'important' : '');
        }
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
    function afterUpdate(fn) {
        get_current_component().$$.after_update.push(fn);
    }
    function onDestroy(fn) {
        get_current_component().$$.on_destroy.push(fn);
    }
    function createEventDispatcher() {
        const component = get_current_component();
        return (type, detail, { cancelable = false } = {}) => {
            const callbacks = component.$$.callbacks[type];
            if (callbacks) {
                // TODO are there situations where events could be dispatched
                // in a server (non-DOM) environment?
                const event = custom_event(type, detail, { cancelable });
                callbacks.slice().forEach(fn => {
                    fn.call(component, event);
                });
                return !event.defaultPrevented;
            }
            return true;
        };
    }
    // TODO figure out if we still want to support
    // shorthand events, or if we want to implement
    // a real bubbling mechanism
    function bubble(component, event) {
        const callbacks = component.$$.callbacks[event.type];
        if (callbacks) {
            // @ts-ignore
            callbacks.slice().forEach(fn => fn.call(this, event));
        }
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function tick() {
        schedule_update();
        return resolved_promise;
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
        const saved_component = current_component;
        do {
            // first, call beforeUpdate functions
            // and update components
            while (flushidx < dirty_components.length) {
                const component = dirty_components[flushidx];
                flushidx++;
                set_current_component(component);
                update(component.$$);
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

    const globals = (typeof window !== 'undefined'
        ? window
        : typeof globalThis !== 'undefined'
            ? globalThis
            : global);

    function get_spread_update(levels, updates) {
        const update = {};
        const to_null_out = {};
        const accounted_for = { $$scope: 1 };
        let i = levels.length;
        while (i--) {
            const o = levels[i];
            const n = updates[i];
            if (n) {
                for (const key in o) {
                    if (!(key in n))
                        to_null_out[key] = 1;
                }
                for (const key in n) {
                    if (!accounted_for[key]) {
                        update[key] = n[key];
                        accounted_for[key] = 1;
                    }
                }
                levels[i] = n;
            }
            else {
                for (const key in o) {
                    accounted_for[key] = 1;
                }
            }
        }
        for (const key in to_null_out) {
            if (!(key in update))
                update[key] = undefined;
        }
        return update;
    }
    function get_spread_object(spread_props) {
        return typeof spread_props === 'object' && spread_props !== null ? spread_props : {};
    }
    function create_component(block) {
        block && block.c();
    }
    function mount_component(component, target, anchor, customElement) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        if (!customElement) {
            // onMount happens before the initial afterUpdate
            add_render_callback(() => {
                const new_on_destroy = on_mount.map(run).filter(is_function);
                if (on_destroy) {
                    on_destroy.push(...new_on_destroy);
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
            ctx: null,
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
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.49.0' }, detail), { bubbles: true }));
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
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev('SvelteDOMRemoveAttribute', { node, attribute });
        else
            dispatch_dev('SvelteDOMSetAttribute', { node, attribute, value });
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

    /**
     * @typedef {Object} WrappedComponent Object returned by the `wrap` method
     * @property {SvelteComponent} component - Component to load (this is always asynchronous)
     * @property {RoutePrecondition[]} [conditions] - Route pre-conditions to validate
     * @property {Object} [props] - Optional dictionary of static props
     * @property {Object} [userData] - Optional user data dictionary
     * @property {bool} _sveltesparouter - Internal flag; always set to true
     */

    /**
     * @callback AsyncSvelteComponent
     * @returns {Promise<SvelteComponent>} Returns a Promise that resolves with a Svelte component
     */

    /**
     * @callback RoutePrecondition
     * @param {RouteDetail} detail - Route detail object
     * @returns {boolean|Promise<boolean>} If the callback returns a false-y value, it's interpreted as the precondition failed, so it aborts loading the component (and won't process other pre-condition callbacks)
     */

    /**
     * @typedef {Object} WrapOptions Options object for the call to `wrap`
     * @property {SvelteComponent} [component] - Svelte component to load (this is incompatible with `asyncComponent`)
     * @property {AsyncSvelteComponent} [asyncComponent] - Function that returns a Promise that fulfills with a Svelte component (e.g. `{asyncComponent: () => import('Foo.svelte')}`)
     * @property {SvelteComponent} [loadingComponent] - Svelte component to be displayed while the async route is loading (as a placeholder); when unset or false-y, no component is shown while component
     * @property {object} [loadingParams] - Optional dictionary passed to the `loadingComponent` component as params (for an exported prop called `params`)
     * @property {object} [userData] - Optional object that will be passed to events such as `routeLoading`, `routeLoaded`, `conditionsFailed`
     * @property {object} [props] - Optional key-value dictionary of static props that will be passed to the component. The props are expanded with {...props}, so the key in the dictionary becomes the name of the prop.
     * @property {RoutePrecondition[]|RoutePrecondition} [conditions] - Route pre-conditions to add, which will be executed in order
     */

    /**
     * Wraps a component to enable multiple capabilities:
     * 1. Using dynamically-imported component, with (e.g. `{asyncComponent: () => import('Foo.svelte')}`), which also allows bundlers to do code-splitting.
     * 2. Adding route pre-conditions (e.g. `{conditions: [...]}`)
     * 3. Adding static props that are passed to the component
     * 4. Adding custom userData, which is passed to route events (e.g. route loaded events) or to route pre-conditions (e.g. `{userData: {foo: 'bar}}`)
     * 
     * @param {WrapOptions} args - Arguments object
     * @returns {WrappedComponent} Wrapped component
     */
    function wrap$1(args) {
        if (!args) {
            throw Error('Parameter args is required')
        }

        // We need to have one and only one of component and asyncComponent
        // This does a "XNOR"
        if (!args.component == !args.asyncComponent) {
            throw Error('One and only one of component and asyncComponent is required')
        }

        // If the component is not async, wrap it into a function returning a Promise
        if (args.component) {
            args.asyncComponent = () => Promise.resolve(args.component);
        }

        // Parameter asyncComponent and each item of conditions must be functions
        if (typeof args.asyncComponent != 'function') {
            throw Error('Parameter asyncComponent must be a function')
        }
        if (args.conditions) {
            // Ensure it's an array
            if (!Array.isArray(args.conditions)) {
                args.conditions = [args.conditions];
            }
            for (let i = 0; i < args.conditions.length; i++) {
                if (!args.conditions[i] || typeof args.conditions[i] != 'function') {
                    throw Error('Invalid parameter conditions[' + i + ']')
                }
            }
        }

        // Check if we have a placeholder component
        if (args.loadingComponent) {
            args.asyncComponent.loading = args.loadingComponent;
            args.asyncComponent.loadingParams = args.loadingParams || undefined;
        }

        // Returns an object that contains all the functions to execute too
        // The _sveltesparouter flag is to confirm the object was created by this router
        const obj = {
            component: args.asyncComponent,
            userData: args.userData,
            conditions: (args.conditions && args.conditions.length) ? args.conditions : undefined,
            props: (args.props && Object.keys(args.props).length) ? args.props : {},
            _sveltesparouter: true
        };

        return obj
    }

    const subscriber_queue = [];
    /**
     * Creates a `Readable` store that allows reading by subscription.
     * @param value initial value
     * @param {StartStopNotifier}start start and stop notifications for subscriptions
     */
    function readable(value, start) {
        return {
            subscribe: writable(value, start).subscribe
        };
    }
    /**
     * Create a `Writable` store that allows both updating and reading by subscription.
     * @param {*=}value initial value
     * @param {StartStopNotifier=}start start and stop notifications for subscriptions
     */
    function writable(value, start = noop) {
        let stop;
        const subscribers = new Set();
        function set(new_value) {
            if (safe_not_equal(value, new_value)) {
                value = new_value;
                if (stop) { // store is ready
                    const run_queue = !subscriber_queue.length;
                    for (const subscriber of subscribers) {
                        subscriber[1]();
                        subscriber_queue.push(subscriber, value);
                    }
                    if (run_queue) {
                        for (let i = 0; i < subscriber_queue.length; i += 2) {
                            subscriber_queue[i][0](subscriber_queue[i + 1]);
                        }
                        subscriber_queue.length = 0;
                    }
                }
            }
        }
        function update(fn) {
            set(fn(value));
        }
        function subscribe(run, invalidate = noop) {
            const subscriber = [run, invalidate];
            subscribers.add(subscriber);
            if (subscribers.size === 1) {
                stop = start(set) || noop;
            }
            run(value);
            return () => {
                subscribers.delete(subscriber);
                if (subscribers.size === 0) {
                    stop();
                    stop = null;
                }
            };
        }
        return { set, update, subscribe };
    }
    function derived(stores, fn, initial_value) {
        const single = !Array.isArray(stores);
        const stores_array = single
            ? [stores]
            : stores;
        const auto = fn.length < 2;
        return readable(initial_value, (set) => {
            let inited = false;
            const values = [];
            let pending = 0;
            let cleanup = noop;
            const sync = () => {
                if (pending) {
                    return;
                }
                cleanup();
                const result = fn(single ? values[0] : values, set);
                if (auto) {
                    set(result);
                }
                else {
                    cleanup = is_function(result) ? result : noop;
                }
            };
            const unsubscribers = stores_array.map((store, i) => subscribe(store, (value) => {
                values[i] = value;
                pending &= ~(1 << i);
                if (inited) {
                    sync();
                }
            }, () => {
                pending |= (1 << i);
            }));
            inited = true;
            sync();
            return function stop() {
                run_all(unsubscribers);
                cleanup();
            };
        });
    }

    function parse(str, loose) {
    	if (str instanceof RegExp) return { keys:false, pattern:str };
    	var c, o, tmp, ext, keys=[], pattern='', arr = str.split('/');
    	arr[0] || arr.shift();

    	while (tmp = arr.shift()) {
    		c = tmp[0];
    		if (c === '*') {
    			keys.push('wild');
    			pattern += '/(.*)';
    		} else if (c === ':') {
    			o = tmp.indexOf('?', 1);
    			ext = tmp.indexOf('.', 1);
    			keys.push( tmp.substring(1, !!~o ? o : !!~ext ? ext : tmp.length) );
    			pattern += !!~o && !~ext ? '(?:/([^/]+?))?' : '/([^/]+?)';
    			if (!!~ext) pattern += (!!~o ? '?' : '') + '\\' + tmp.substring(ext);
    		} else {
    			pattern += '/' + tmp;
    		}
    	}

    	return {
    		keys: keys,
    		pattern: new RegExp('^' + pattern + (loose ? '(?=$|\/)' : '\/?$'), 'i')
    	};
    }

    /* node_modules\svelte-spa-router\Router.svelte generated by Svelte v3.49.0 */

    const { Error: Error_1, Object: Object_1, console: console_1 } = globals;

    // (251:0) {:else}
    function create_else_block(ctx) {
    	let switch_instance;
    	let switch_instance_anchor;
    	let current;
    	const switch_instance_spread_levels = [/*props*/ ctx[2]];
    	var switch_value = /*component*/ ctx[0];

    	function switch_props(ctx) {
    		let switch_instance_props = {};

    		for (let i = 0; i < switch_instance_spread_levels.length; i += 1) {
    			switch_instance_props = assign(switch_instance_props, switch_instance_spread_levels[i]);
    		}

    		return {
    			props: switch_instance_props,
    			$$inline: true
    		};
    	}

    	if (switch_value) {
    		switch_instance = new switch_value(switch_props());
    		switch_instance.$on("routeEvent", /*routeEvent_handler_1*/ ctx[7]);
    	}

    	const block = {
    		c: function create() {
    			if (switch_instance) create_component(switch_instance.$$.fragment);
    			switch_instance_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			if (switch_instance) {
    				mount_component(switch_instance, target, anchor);
    			}

    			insert_dev(target, switch_instance_anchor, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const switch_instance_changes = (dirty & /*props*/ 4)
    			? get_spread_update(switch_instance_spread_levels, [get_spread_object(/*props*/ ctx[2])])
    			: {};

    			if (switch_value !== (switch_value = /*component*/ ctx[0])) {
    				if (switch_instance) {
    					group_outros();
    					const old_component = switch_instance;

    					transition_out(old_component.$$.fragment, 1, 0, () => {
    						destroy_component(old_component, 1);
    					});

    					check_outros();
    				}

    				if (switch_value) {
    					switch_instance = new switch_value(switch_props());
    					switch_instance.$on("routeEvent", /*routeEvent_handler_1*/ ctx[7]);
    					create_component(switch_instance.$$.fragment);
    					transition_in(switch_instance.$$.fragment, 1);
    					mount_component(switch_instance, switch_instance_anchor.parentNode, switch_instance_anchor);
    				} else {
    					switch_instance = null;
    				}
    			} else if (switch_value) {
    				switch_instance.$set(switch_instance_changes);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			if (switch_instance) transition_in(switch_instance.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			if (switch_instance) transition_out(switch_instance.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(switch_instance_anchor);
    			if (switch_instance) destroy_component(switch_instance, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block.name,
    		type: "else",
    		source: "(251:0) {:else}",
    		ctx
    	});

    	return block;
    }

    // (244:0) {#if componentParams}
    function create_if_block(ctx) {
    	let switch_instance;
    	let switch_instance_anchor;
    	let current;
    	const switch_instance_spread_levels = [{ params: /*componentParams*/ ctx[1] }, /*props*/ ctx[2]];
    	var switch_value = /*component*/ ctx[0];

    	function switch_props(ctx) {
    		let switch_instance_props = {};

    		for (let i = 0; i < switch_instance_spread_levels.length; i += 1) {
    			switch_instance_props = assign(switch_instance_props, switch_instance_spread_levels[i]);
    		}

    		return {
    			props: switch_instance_props,
    			$$inline: true
    		};
    	}

    	if (switch_value) {
    		switch_instance = new switch_value(switch_props());
    		switch_instance.$on("routeEvent", /*routeEvent_handler*/ ctx[6]);
    	}

    	const block = {
    		c: function create() {
    			if (switch_instance) create_component(switch_instance.$$.fragment);
    			switch_instance_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			if (switch_instance) {
    				mount_component(switch_instance, target, anchor);
    			}

    			insert_dev(target, switch_instance_anchor, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const switch_instance_changes = (dirty & /*componentParams, props*/ 6)
    			? get_spread_update(switch_instance_spread_levels, [
    					dirty & /*componentParams*/ 2 && { params: /*componentParams*/ ctx[1] },
    					dirty & /*props*/ 4 && get_spread_object(/*props*/ ctx[2])
    				])
    			: {};

    			if (switch_value !== (switch_value = /*component*/ ctx[0])) {
    				if (switch_instance) {
    					group_outros();
    					const old_component = switch_instance;

    					transition_out(old_component.$$.fragment, 1, 0, () => {
    						destroy_component(old_component, 1);
    					});

    					check_outros();
    				}

    				if (switch_value) {
    					switch_instance = new switch_value(switch_props());
    					switch_instance.$on("routeEvent", /*routeEvent_handler*/ ctx[6]);
    					create_component(switch_instance.$$.fragment);
    					transition_in(switch_instance.$$.fragment, 1);
    					mount_component(switch_instance, switch_instance_anchor.parentNode, switch_instance_anchor);
    				} else {
    					switch_instance = null;
    				}
    			} else if (switch_value) {
    				switch_instance.$set(switch_instance_changes);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			if (switch_instance) transition_in(switch_instance.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			if (switch_instance) transition_out(switch_instance.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(switch_instance_anchor);
    			if (switch_instance) destroy_component(switch_instance, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block.name,
    		type: "if",
    		source: "(244:0) {#if componentParams}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$5(ctx) {
    	let current_block_type_index;
    	let if_block;
    	let if_block_anchor;
    	let current;
    	const if_block_creators = [create_if_block, create_else_block];
    	const if_blocks = [];

    	function select_block_type(ctx, dirty) {
    		if (/*componentParams*/ ctx[1]) return 0;
    		return 1;
    	}

    	current_block_type_index = select_block_type(ctx);
    	if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);

    	const block = {
    		c: function create() {
    			if_block.c();
    			if_block_anchor = empty();
    		},
    		l: function claim(nodes) {
    			throw new Error_1("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			if_blocks[current_block_type_index].m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			let previous_block_index = current_block_type_index;
    			current_block_type_index = select_block_type(ctx);

    			if (current_block_type_index === previous_block_index) {
    				if_blocks[current_block_type_index].p(ctx, dirty);
    			} else {
    				group_outros();

    				transition_out(if_blocks[previous_block_index], 1, 1, () => {
    					if_blocks[previous_block_index] = null;
    				});

    				check_outros();
    				if_block = if_blocks[current_block_type_index];

    				if (!if_block) {
    					if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    					if_block.c();
    				} else {
    					if_block.p(ctx, dirty);
    				}

    				transition_in(if_block, 1);
    				if_block.m(if_block_anchor.parentNode, if_block_anchor);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if_blocks[current_block_type_index].d(detaching);
    			if (detaching) detach_dev(if_block_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$5.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function wrap(component, userData, ...conditions) {
    	// Use the new wrap method and show a deprecation warning
    	// eslint-disable-next-line no-console
    	console.warn('Method `wrap` from `svelte-spa-router` is deprecated and will be removed in a future version. Please use `svelte-spa-router/wrap` instead. See http://bit.ly/svelte-spa-router-upgrading');

    	return wrap$1({ component, userData, conditions });
    }

    /**
     * @typedef {Object} Location
     * @property {string} location - Location (page/view), for example `/book`
     * @property {string} [querystring] - Querystring from the hash, as a string not parsed
     */
    /**
     * Returns the current location from the hash.
     *
     * @returns {Location} Location object
     * @private
     */
    function getLocation() {
    	const hashPosition = window.location.href.indexOf('#/');

    	let location = hashPosition > -1
    	? window.location.href.substr(hashPosition + 1)
    	: '/';

    	// Check if there's a querystring
    	const qsPosition = location.indexOf('?');

    	let querystring = '';

    	if (qsPosition > -1) {
    		querystring = location.substr(qsPosition + 1);
    		location = location.substr(0, qsPosition);
    	}

    	return { location, querystring };
    }

    const loc = readable(null, // eslint-disable-next-line prefer-arrow-callback
    function start(set) {
    	set(getLocation());

    	const update = () => {
    		set(getLocation());
    	};

    	window.addEventListener('hashchange', update, false);

    	return function stop() {
    		window.removeEventListener('hashchange', update, false);
    	};
    });

    const location = derived(loc, $loc => $loc.location);
    const querystring = derived(loc, $loc => $loc.querystring);
    const params = writable(undefined);

    async function push(location) {
    	if (!location || location.length < 1 || location.charAt(0) != '/' && location.indexOf('#/') !== 0) {
    		throw Error('Invalid parameter location');
    	}

    	// Execute this code when the current call stack is complete
    	await tick();

    	// Note: this will include scroll state in history even when restoreScrollState is false
    	history.replaceState(
    		{
    			...history.state,
    			__svelte_spa_router_scrollX: window.scrollX,
    			__svelte_spa_router_scrollY: window.scrollY
    		},
    		undefined,
    		undefined
    	);

    	window.location.hash = (location.charAt(0) == '#' ? '' : '#') + location;
    }

    async function pop() {
    	// Execute this code when the current call stack is complete
    	await tick();

    	window.history.back();
    }

    async function replace(location) {
    	if (!location || location.length < 1 || location.charAt(0) != '/' && location.indexOf('#/') !== 0) {
    		throw Error('Invalid parameter location');
    	}

    	// Execute this code when the current call stack is complete
    	await tick();

    	const dest = (location.charAt(0) == '#' ? '' : '#') + location;

    	try {
    		const newState = { ...history.state };
    		delete newState['__svelte_spa_router_scrollX'];
    		delete newState['__svelte_spa_router_scrollY'];
    		window.history.replaceState(newState, undefined, dest);
    	} catch(e) {
    		// eslint-disable-next-line no-console
    		console.warn('Caught exception while replacing the current page. If you\'re running this in the Svelte REPL, please note that the `replace` method might not work in this environment.');
    	}

    	// The method above doesn't trigger the hashchange event, so let's do that manually
    	window.dispatchEvent(new Event('hashchange'));
    }

    function link(node, opts) {
    	opts = linkOpts(opts);

    	// Only apply to <a> tags
    	if (!node || !node.tagName || node.tagName.toLowerCase() != 'a') {
    		throw Error('Action "link" can only be used with <a> tags');
    	}

    	updateLink(node, opts);

    	return {
    		update(updated) {
    			updated = linkOpts(updated);
    			updateLink(node, updated);
    		}
    	};
    }

    // Internal function used by the link function
    function updateLink(node, opts) {
    	let href = opts.href || node.getAttribute('href');

    	// Destination must start with '/' or '#/'
    	if (href && href.charAt(0) == '/') {
    		// Add # to the href attribute
    		href = '#' + href;
    	} else if (!href || href.length < 2 || href.slice(0, 2) != '#/') {
    		throw Error('Invalid value for "href" attribute: ' + href);
    	}

    	node.setAttribute('href', href);

    	node.addEventListener('click', event => {
    		// Prevent default anchor onclick behaviour
    		event.preventDefault();

    		if (!opts.disabled) {
    			scrollstateHistoryHandler(event.currentTarget.getAttribute('href'));
    		}
    	});
    }

    // Internal function that ensures the argument of the link action is always an object
    function linkOpts(val) {
    	if (val && typeof val == 'string') {
    		return { href: val };
    	} else {
    		return val || {};
    	}
    }

    /**
     * The handler attached to an anchor tag responsible for updating the
     * current history state with the current scroll state
     *
     * @param {string} href - Destination
     */
    function scrollstateHistoryHandler(href) {
    	// Setting the url (3rd arg) to href will break clicking for reasons, so don't try to do that
    	history.replaceState(
    		{
    			...history.state,
    			__svelte_spa_router_scrollX: window.scrollX,
    			__svelte_spa_router_scrollY: window.scrollY
    		},
    		undefined,
    		undefined
    	);

    	// This will force an update as desired, but this time our scroll state will be attached
    	window.location.hash = href;
    }

    function instance$5($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Router', slots, []);
    	let { routes = {} } = $$props;
    	let { prefix = '' } = $$props;
    	let { restoreScrollState = false } = $$props;

    	/**
     * Container for a route: path, component
     */
    	class RouteItem {
    		/**
     * Initializes the object and creates a regular expression from the path, using regexparam.
     *
     * @param {string} path - Path to the route (must start with '/' or '*')
     * @param {SvelteComponent|WrappedComponent} component - Svelte component for the route, optionally wrapped
     */
    		constructor(path, component) {
    			if (!component || typeof component != 'function' && (typeof component != 'object' || component._sveltesparouter !== true)) {
    				throw Error('Invalid component object');
    			}

    			// Path must be a regular or expression, or a string starting with '/' or '*'
    			if (!path || typeof path == 'string' && (path.length < 1 || path.charAt(0) != '/' && path.charAt(0) != '*') || typeof path == 'object' && !(path instanceof RegExp)) {
    				throw Error('Invalid value for "path" argument - strings must start with / or *');
    			}

    			const { pattern, keys } = parse(path);
    			this.path = path;

    			// Check if the component is wrapped and we have conditions
    			if (typeof component == 'object' && component._sveltesparouter === true) {
    				this.component = component.component;
    				this.conditions = component.conditions || [];
    				this.userData = component.userData;
    				this.props = component.props || {};
    			} else {
    				// Convert the component to a function that returns a Promise, to normalize it
    				this.component = () => Promise.resolve(component);

    				this.conditions = [];
    				this.props = {};
    			}

    			this._pattern = pattern;
    			this._keys = keys;
    		}

    		/**
     * Checks if `path` matches the current route.
     * If there's a match, will return the list of parameters from the URL (if any).
     * In case of no match, the method will return `null`.
     *
     * @param {string} path - Path to test
     * @returns {null|Object.<string, string>} List of paramters from the URL if there's a match, or `null` otherwise.
     */
    		match(path) {
    			// If there's a prefix, check if it matches the start of the path.
    			// If not, bail early, else remove it before we run the matching.
    			if (prefix) {
    				if (typeof prefix == 'string') {
    					if (path.startsWith(prefix)) {
    						path = path.substr(prefix.length) || '/';
    					} else {
    						return null;
    					}
    				} else if (prefix instanceof RegExp) {
    					const match = path.match(prefix);

    					if (match && match[0]) {
    						path = path.substr(match[0].length) || '/';
    					} else {
    						return null;
    					}
    				}
    			}

    			// Check if the pattern matches
    			const matches = this._pattern.exec(path);

    			if (matches === null) {
    				return null;
    			}

    			// If the input was a regular expression, this._keys would be false, so return matches as is
    			if (this._keys === false) {
    				return matches;
    			}

    			const out = {};
    			let i = 0;

    			while (i < this._keys.length) {
    				// In the match parameters, URL-decode all values
    				try {
    					out[this._keys[i]] = decodeURIComponent(matches[i + 1] || '') || null;
    				} catch(e) {
    					out[this._keys[i]] = null;
    				}

    				i++;
    			}

    			return out;
    		}

    		/**
     * Dictionary with route details passed to the pre-conditions functions, as well as the `routeLoading`, `routeLoaded` and `conditionsFailed` events
     * @typedef {Object} RouteDetail
     * @property {string|RegExp} route - Route matched as defined in the route definition (could be a string or a reguar expression object)
     * @property {string} location - Location path
     * @property {string} querystring - Querystring from the hash
     * @property {object} [userData] - Custom data passed by the user
     * @property {SvelteComponent} [component] - Svelte component (only in `routeLoaded` events)
     * @property {string} [name] - Name of the Svelte component (only in `routeLoaded` events)
     */
    		/**
     * Executes all conditions (if any) to control whether the route can be shown. Conditions are executed in the order they are defined, and if a condition fails, the following ones aren't executed.
     * 
     * @param {RouteDetail} detail - Route detail
     * @returns {boolean} Returns true if all the conditions succeeded
     */
    		async checkConditions(detail) {
    			for (let i = 0; i < this.conditions.length; i++) {
    				if (!await this.conditions[i](detail)) {
    					return false;
    				}
    			}

    			return true;
    		}
    	}

    	// Set up all routes
    	const routesList = [];

    	if (routes instanceof Map) {
    		// If it's a map, iterate on it right away
    		routes.forEach((route, path) => {
    			routesList.push(new RouteItem(path, route));
    		});
    	} else {
    		// We have an object, so iterate on its own properties
    		Object.keys(routes).forEach(path => {
    			routesList.push(new RouteItem(path, routes[path]));
    		});
    	}

    	// Props for the component to render
    	let component = null;

    	let componentParams = null;
    	let props = {};

    	// Event dispatcher from Svelte
    	const dispatch = createEventDispatcher();

    	// Just like dispatch, but executes on the next iteration of the event loop
    	async function dispatchNextTick(name, detail) {
    		// Execute this code when the current call stack is complete
    		await tick();

    		dispatch(name, detail);
    	}

    	// If this is set, then that means we have popped into this var the state of our last scroll position
    	let previousScrollState = null;

    	let popStateChanged = null;

    	if (restoreScrollState) {
    		popStateChanged = event => {
    			// If this event was from our history.replaceState, event.state will contain
    			// our scroll history. Otherwise, event.state will be null (like on forward
    			// navigation)
    			if (event.state && event.state.__svelte_spa_router_scrollY) {
    				previousScrollState = event.state;
    			} else {
    				previousScrollState = null;
    			}
    		};

    		// This is removed in the destroy() invocation below
    		window.addEventListener('popstate', popStateChanged);

    		afterUpdate(() => {
    			// If this exists, then this is a back navigation: restore the scroll position
    			if (previousScrollState) {
    				window.scrollTo(previousScrollState.__svelte_spa_router_scrollX, previousScrollState.__svelte_spa_router_scrollY);
    			} else {
    				// Otherwise this is a forward navigation: scroll to top
    				window.scrollTo(0, 0);
    			}
    		});
    	}

    	// Always have the latest value of loc
    	let lastLoc = null;

    	// Current object of the component loaded
    	let componentObj = null;

    	// Handle hash change events
    	// Listen to changes in the $loc store and update the page
    	// Do not use the $: syntax because it gets triggered by too many things
    	const unsubscribeLoc = loc.subscribe(async newLoc => {
    		lastLoc = newLoc;

    		// Find a route matching the location
    		let i = 0;

    		while (i < routesList.length) {
    			const match = routesList[i].match(newLoc.location);

    			if (!match) {
    				i++;
    				continue;
    			}

    			const detail = {
    				route: routesList[i].path,
    				location: newLoc.location,
    				querystring: newLoc.querystring,
    				userData: routesList[i].userData,
    				params: match && typeof match == 'object' && Object.keys(match).length
    				? match
    				: null
    			};

    			// Check if the route can be loaded - if all conditions succeed
    			if (!await routesList[i].checkConditions(detail)) {
    				// Don't display anything
    				$$invalidate(0, component = null);

    				componentObj = null;

    				// Trigger an event to notify the user, then exit
    				dispatchNextTick('conditionsFailed', detail);

    				return;
    			}

    			// Trigger an event to alert that we're loading the route
    			// We need to clone the object on every event invocation so we don't risk the object to be modified in the next tick
    			dispatchNextTick('routeLoading', Object.assign({}, detail));

    			// If there's a component to show while we're loading the route, display it
    			const obj = routesList[i].component;

    			// Do not replace the component if we're loading the same one as before, to avoid the route being unmounted and re-mounted
    			if (componentObj != obj) {
    				if (obj.loading) {
    					$$invalidate(0, component = obj.loading);
    					componentObj = obj;
    					$$invalidate(1, componentParams = obj.loadingParams);
    					$$invalidate(2, props = {});

    					// Trigger the routeLoaded event for the loading component
    					// Create a copy of detail so we don't modify the object for the dynamic route (and the dynamic route doesn't modify our object too)
    					dispatchNextTick('routeLoaded', Object.assign({}, detail, {
    						component,
    						name: component.name,
    						params: componentParams
    					}));
    				} else {
    					$$invalidate(0, component = null);
    					componentObj = null;
    				}

    				// Invoke the Promise
    				const loaded = await obj();

    				// Now that we're here, after the promise resolved, check if we still want this component, as the user might have navigated to another page in the meanwhile
    				if (newLoc != lastLoc) {
    					// Don't update the component, just exit
    					return;
    				}

    				// If there is a "default" property, which is used by async routes, then pick that
    				$$invalidate(0, component = loaded && loaded.default || loaded);

    				componentObj = obj;
    			}

    			// Set componentParams only if we have a match, to avoid a warning similar to `<Component> was created with unknown prop 'params'`
    			// Of course, this assumes that developers always add a "params" prop when they are expecting parameters
    			if (match && typeof match == 'object' && Object.keys(match).length) {
    				$$invalidate(1, componentParams = match);
    			} else {
    				$$invalidate(1, componentParams = null);
    			}

    			// Set static props, if any
    			$$invalidate(2, props = routesList[i].props);

    			// Dispatch the routeLoaded event then exit
    			// We need to clone the object on every event invocation so we don't risk the object to be modified in the next tick
    			dispatchNextTick('routeLoaded', Object.assign({}, detail, {
    				component,
    				name: component.name,
    				params: componentParams
    			})).then(() => {
    				params.set(componentParams);
    			});

    			return;
    		}

    		// If we're still here, there was no match, so show the empty component
    		$$invalidate(0, component = null);

    		componentObj = null;
    		params.set(undefined);
    	});

    	onDestroy(() => {
    		unsubscribeLoc();
    		popStateChanged && window.removeEventListener('popstate', popStateChanged);
    	});

    	const writable_props = ['routes', 'prefix', 'restoreScrollState'];

    	Object_1.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console_1.warn(`<Router> was created with unknown prop '${key}'`);
    	});

    	function routeEvent_handler(event) {
    		bubble.call(this, $$self, event);
    	}

    	function routeEvent_handler_1(event) {
    		bubble.call(this, $$self, event);
    	}

    	$$self.$$set = $$props => {
    		if ('routes' in $$props) $$invalidate(3, routes = $$props.routes);
    		if ('prefix' in $$props) $$invalidate(4, prefix = $$props.prefix);
    		if ('restoreScrollState' in $$props) $$invalidate(5, restoreScrollState = $$props.restoreScrollState);
    	};

    	$$self.$capture_state = () => ({
    		readable,
    		writable,
    		derived,
    		tick,
    		_wrap: wrap$1,
    		wrap,
    		getLocation,
    		loc,
    		location,
    		querystring,
    		params,
    		push,
    		pop,
    		replace,
    		link,
    		updateLink,
    		linkOpts,
    		scrollstateHistoryHandler,
    		onDestroy,
    		createEventDispatcher,
    		afterUpdate,
    		parse,
    		routes,
    		prefix,
    		restoreScrollState,
    		RouteItem,
    		routesList,
    		component,
    		componentParams,
    		props,
    		dispatch,
    		dispatchNextTick,
    		previousScrollState,
    		popStateChanged,
    		lastLoc,
    		componentObj,
    		unsubscribeLoc
    	});

    	$$self.$inject_state = $$props => {
    		if ('routes' in $$props) $$invalidate(3, routes = $$props.routes);
    		if ('prefix' in $$props) $$invalidate(4, prefix = $$props.prefix);
    		if ('restoreScrollState' in $$props) $$invalidate(5, restoreScrollState = $$props.restoreScrollState);
    		if ('component' in $$props) $$invalidate(0, component = $$props.component);
    		if ('componentParams' in $$props) $$invalidate(1, componentParams = $$props.componentParams);
    		if ('props' in $$props) $$invalidate(2, props = $$props.props);
    		if ('previousScrollState' in $$props) previousScrollState = $$props.previousScrollState;
    		if ('popStateChanged' in $$props) popStateChanged = $$props.popStateChanged;
    		if ('lastLoc' in $$props) lastLoc = $$props.lastLoc;
    		if ('componentObj' in $$props) componentObj = $$props.componentObj;
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*restoreScrollState*/ 32) {
    			// Update history.scrollRestoration depending on restoreScrollState
    			history.scrollRestoration = restoreScrollState ? 'manual' : 'auto';
    		}
    	};

    	return [
    		component,
    		componentParams,
    		props,
    		routes,
    		prefix,
    		restoreScrollState,
    		routeEvent_handler,
    		routeEvent_handler_1
    	];
    }

    class Router extends SvelteComponentDev {
    	constructor(options) {
    		super(options);

    		init(this, options, instance$5, create_fragment$5, safe_not_equal, {
    			routes: 3,
    			prefix: 4,
    			restoreScrollState: 5
    		});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Router",
    			options,
    			id: create_fragment$5.name
    		});
    	}

    	get routes() {
    		throw new Error_1("<Router>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set routes(value) {
    		throw new Error_1("<Router>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get prefix() {
    		throw new Error_1("<Router>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set prefix(value) {
    		throw new Error_1("<Router>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get restoreScrollState() {
    		throw new Error_1("<Router>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set restoreScrollState(value) {
    		throw new Error_1("<Router>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\component\layout\Nav.svelte generated by Svelte v3.49.0 */
    const file$4 = "src\\component\\layout\\Nav.svelte";

    function create_fragment$4(ctx) {
    	let nav;
    	let div1;
    	let a0;
    	let img;
    	let img_src_value;
    	let t0;
    	let ul0;
    	let li0;
    	let a1;
    	let t2;
    	let li1;
    	let a2;
    	let t4;
    	let li2;
    	let a3;
    	let t6;
    	let button;
    	let i;
    	let t7;
    	let div0;
    	let ul1;
    	let li3;
    	let a4;
    	let t9;
    	let li4;
    	let a5;
    	let t11;
    	let li5;
    	let a6;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			nav = element("nav");
    			div1 = element("div");
    			a0 = element("a");
    			img = element("img");
    			t0 = space();
    			ul0 = element("ul");
    			li0 = element("li");
    			a1 = element("a");
    			a1.textContent = "내파티";
    			t2 = space();
    			li1 = element("li");
    			a2 = element("a");
    			a2.textContent = "파티찾기";
    			t4 = space();
    			li2 = element("li");
    			a3 = element("a");
    			a3.textContent = "사용법";
    			t6 = space();
    			button = element("button");
    			i = element("i");
    			t7 = space();
    			div0 = element("div");
    			ul1 = element("ul");
    			li3 = element("li");
    			a4 = element("a");
    			a4.textContent = "내파티";
    			t9 = space();
    			li4 = element("li");
    			a5 = element("a");
    			a5.textContent = "파티찾기";
    			t11 = space();
    			li5 = element("li");
    			a6 = element("a");
    			a6.textContent = "사용법";
    			if (!src_url_equal(img.src, img_src_value = "./assets/img/logo.svg")) attr_dev(img, "src", img_src_value);
    			attr_dev(img, "class", "navbar-brand-img");
    			attr_dev(img, "alt", "...");
    			add_location(img, file$4, 9, 6, 249);
    			attr_dev(a0, "class", "navbar-brand");
    			attr_dev(a0, "href", "./index.html");
    			add_location(a0, file$4, 8, 4, 197);
    			attr_dev(a1, "class", "nav-link");
    			attr_dev(a1, "id", "nav-myparty");
    			attr_dev(a1, "href", "/myparty");
    			attr_dev(a1, "aria-haspopup", "true");
    			attr_dev(a1, "aria-expanded", "false");
    			add_location(a1, file$4, 15, 8, 424);
    			attr_dev(li0, "class", "nav-item");
    			add_location(li0, file$4, 14, 6, 393);
    			attr_dev(a2, "class", "nav-link");
    			attr_dev(a2, "id", "nav-find");
    			attr_dev(a2, "href", "./find_leader.html");
    			attr_dev(a2, "aria-haspopup", "true");
    			attr_dev(a2, "aria-expanded", "false");
    			add_location(a2, file$4, 18, 8, 590);
    			attr_dev(li1, "class", "nav-item");
    			add_location(li1, file$4, 17, 6, 559);
    			attr_dev(a3, "class", "nav-link");
    			attr_dev(a3, "id", "nav-manual");
    			attr_dev(a3, "href", "./guide.html");
    			attr_dev(a3, "aria-haspopup", "true");
    			attr_dev(a3, "aria-expanded", "false");
    			add_location(a3, file$4, 21, 8, 763);
    			attr_dev(li2, "class", "nav-item me-sm-4");
    			add_location(li2, file$4, 20, 6, 724);
    			attr_dev(ul0, "class", "navbar-nav");
    			add_location(ul0, file$4, 13, 4, 362);
    			attr_dev(i, "class", "fa-regular fa-user fa-lg");
    			add_location(i, file$4, 27, 6, 1021);
    			attr_dev(button, "class", "navbar-btn btn btn-primary ms-md-11");
    			attr_dev(button, "href", "./mypage.html");
    			attr_dev(button, "target", "_blank");
    			add_location(button, file$4, 26, 4, 924);
    			attr_dev(a4, "id", "nav-myparty");
    			attr_dev(a4, "href", "/myparty_login.html");
    			attr_dev(a4, "aria-haspopup", "true");
    			attr_dev(a4, "aria-expanded", "false");
    			add_location(a4, file$4, 33, 10, 1259);
    			attr_dev(li3, "class", "me-6");
    			add_location(li3, file$4, 32, 8, 1230);
    			attr_dev(a5, "id", "nav-find");
    			attr_dev(a5, "href", "/find_leader.html");
    			attr_dev(a5, "aria-haspopup", "true");
    			attr_dev(a5, "aria-expanded", "false");
    			add_location(a5, file$4, 36, 10, 1410);
    			attr_dev(li4, "class", "me-6");
    			add_location(li4, file$4, 35, 8, 1381);
    			attr_dev(a6, "id", "nav-manual");
    			attr_dev(a6, "href", "/guide.html");
    			attr_dev(a6, "aria-haspopup", "true");
    			attr_dev(a6, "aria-expanded", "false");
    			add_location(a6, file$4, 39, 10, 1553);
    			attr_dev(li5, "class", "");
    			add_location(li5, file$4, 38, 8, 1528);
    			attr_dev(ul1, "class", "d-flex justify-content-center list-unstyled ");
    			add_location(ul1, file$4, 31, 6, 1163);
    			attr_dev(div0, "class", "container pt-6 nav_m border-nav-bottom");
    			add_location(div0, file$4, 30, 4, 1103);
    			attr_dev(div1, "class", "container");
    			add_location(div1, file$4, 6, 2, 148);
    			attr_dev(nav, "class", "navbar navbar-expand-lg navbar-light bg-white");
    			add_location(nav, file$4, 5, 0, 85);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, nav, anchor);
    			append_dev(nav, div1);
    			append_dev(div1, a0);
    			append_dev(a0, img);
    			append_dev(div1, t0);
    			append_dev(div1, ul0);
    			append_dev(ul0, li0);
    			append_dev(li0, a1);
    			append_dev(ul0, t2);
    			append_dev(ul0, li1);
    			append_dev(li1, a2);
    			append_dev(ul0, t4);
    			append_dev(ul0, li2);
    			append_dev(li2, a3);
    			append_dev(div1, t6);
    			append_dev(div1, button);
    			append_dev(button, i);
    			append_dev(div1, t7);
    			append_dev(div1, div0);
    			append_dev(div0, ul1);
    			append_dev(ul1, li3);
    			append_dev(li3, a4);
    			append_dev(ul1, t9);
    			append_dev(ul1, li4);
    			append_dev(li4, a5);
    			append_dev(ul1, t11);
    			append_dev(ul1, li5);
    			append_dev(li5, a6);

    			if (!mounted) {
    				dispose = action_destroyer(link.call(null, a1));
    				mounted = true;
    			}
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(nav);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$4.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$4($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Nav', slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Nav> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({ link });
    	return [];
    }

    class Nav extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$4, create_fragment$4, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Nav",
    			options,
    			id: create_fragment$4.name
    		});
    	}
    }

    /* src\component\layout\Footer.svelte generated by Svelte v3.49.0 */

    const file$3 = "src\\component\\layout\\Footer.svelte";

    function create_fragment$3(ctx) {
    	let footer;
    	let div5;
    	let div4;
    	let div1;
    	let ul;
    	let li0;
    	let a0;
    	let t1;
    	let li1;
    	let t3;
    	let li2;
    	let a1;
    	let t5;
    	let li3;
    	let t7;
    	let li4;
    	let a2;
    	let t9;
    	let div0;
    	let img;
    	let img_src_value;
    	let t10;
    	let div3;
    	let div2;
    	let p0;
    	let t12;
    	let p1;
    	let t14;
    	let div7;
    	let div6;
    	let h6;

    	const block = {
    		c: function create() {
    			footer = element("footer");
    			div5 = element("div");
    			div4 = element("div");
    			div1 = element("div");
    			ul = element("ul");
    			li0 = element("li");
    			a0 = element("a");
    			a0.textContent = "이용약관";
    			t1 = space();
    			li1 = element("li");
    			li1.textContent = "｜";
    			t3 = space();
    			li2 = element("li");
    			a1 = element("a");
    			a1.textContent = "개인정보처리방침";
    			t5 = space();
    			li3 = element("li");
    			li3.textContent = "｜";
    			t7 = space();
    			li4 = element("li");
    			a2 = element("a");
    			a2.textContent = "문의하기";
    			t9 = space();
    			div0 = element("div");
    			img = element("img");
    			t10 = space();
    			div3 = element("div");
    			div2 = element("div");
    			p0 = element("p");
    			p0.textContent = "우발적계획 ｜ 대표 : 신보언 ｜ 사업자등록번호 : 554-19-01814 ｜\r\n            통신판매업신고번호 : 2020-서울강남-03117";
    			t12 = space();
    			p1 = element("p");
    			p1.textContent = "Copyright 2022. 우발적계획 All rights reserved.";
    			t14 = space();
    			div7 = element("div");
    			div6 = element("div");
    			h6 = element("h6");
    			h6.textContent = "우발적계획은 통신판매중개자이며 통신판매 당사자가 아닙니다. 등록한\r\n        상품에 대한 상품정보 및 거래에 관한 의무와 책임은 공급자에게 있고,\r\n        우발적계획은 이에 대한 책임과 의무를 지니지 아니합니다.";
    			attr_dev(a0, "href", "#");
    			attr_dev(a0, "class", "text-white");
    			add_location(a0, file$3, 7, 12, 312);
    			add_location(li0, file$3, 6, 10, 294);
    			add_location(li1, file$3, 9, 10, 380);
    			attr_dev(a1, "href", "#");
    			attr_dev(a1, "class", "text-white");
    			add_location(a1, file$3, 11, 12, 436);
    			attr_dev(li2, "class", "fw-bold");
    			add_location(li2, file$3, 10, 10, 402);
    			add_location(li3, file$3, 13, 10, 508);
    			attr_dev(a2, "href", "#");
    			attr_dev(a2, "class", "text-white");
    			add_location(a2, file$3, 15, 12, 548);
    			add_location(li4, file$3, 14, 10, 530);
    			attr_dev(ul, "class", "list-inline text-white d-flex justify-content-between mb-7");
    			add_location(ul, file$3, 5, 8, 210);
    			if (!src_url_equal(img.src, img_src_value = "./assets/img/logo_w.svg")) attr_dev(img, "src", img_src_value);
    			attr_dev(img, "alt", "...");
    			attr_dev(img, "class", "footer-brand img-fluid mb-5 mw-lg-50 ");
    			add_location(img, file$3, 20, 10, 708);
    			attr_dev(div0, "class", "d-flex justify-content-center");
    			add_location(div0, file$3, 19, 8, 653);
    			attr_dev(div1, "class", "col-12 col-md-6");
    			add_location(div1, file$3, 4, 6, 171);
    			attr_dev(p0, "class", "fw-light");
    			add_location(p0, file$3, 32, 10, 1046);
    			attr_dev(p1, "class", "fs-6 fw-light");
    			add_location(p1, file$3, 36, 10, 1192);
    			attr_dev(div2, "class", "d-flex justify-content-center text-white flex-column align-items-center");
    			add_location(div2, file$3, 29, 8, 928);
    			add_location(div3, file$3, 27, 6, 890);
    			attr_dev(div4, "class", "row align-items-center justify-content-center flex-column");
    			add_location(div4, file$3, 3, 4, 92);
    			attr_dev(div5, "class", "container py-8 pt-5 pb-3");
    			add_location(div5, file$3, 2, 2, 48);
    			attr_dev(h6, "class", "m-md-0");
    			add_location(h6, file$3, 47, 6, 1498);
    			attr_dev(div6, "class", "d-flex justify-content-center");
    			add_location(div6, file$3, 46, 4, 1447);
    			attr_dev(div7, "class", "container-fluid bg-gray-300 py-sm-4 ");
    			add_location(div7, file$3, 45, 2, 1391);
    			attr_dev(footer, "class", "bg-footer");
    			add_location(footer, file$3, 1, 0, 17);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, footer, anchor);
    			append_dev(footer, div5);
    			append_dev(div5, div4);
    			append_dev(div4, div1);
    			append_dev(div1, ul);
    			append_dev(ul, li0);
    			append_dev(li0, a0);
    			append_dev(ul, t1);
    			append_dev(ul, li1);
    			append_dev(ul, t3);
    			append_dev(ul, li2);
    			append_dev(li2, a1);
    			append_dev(ul, t5);
    			append_dev(ul, li3);
    			append_dev(ul, t7);
    			append_dev(ul, li4);
    			append_dev(li4, a2);
    			append_dev(div1, t9);
    			append_dev(div1, div0);
    			append_dev(div0, img);
    			append_dev(div4, t10);
    			append_dev(div4, div3);
    			append_dev(div3, div2);
    			append_dev(div2, p0);
    			append_dev(div2, t12);
    			append_dev(div2, p1);
    			append_dev(footer, t14);
    			append_dev(footer, div7);
    			append_dev(div7, div6);
    			append_dev(div6, h6);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(footer);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$3.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$3($$self, $$props) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Footer', slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Footer> was created with unknown prop '${key}'`);
    	});

    	return [];
    }

    class Footer extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$3, create_fragment$3, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Footer",
    			options,
    			id: create_fragment$3.name
    		});
    	}
    }

    /* src\component\page\Index.svelte generated by Svelte v3.49.0 */

    const file$2 = "src\\component\\page\\Index.svelte";

    function create_fragment$2(ctx) {
    	let section0;
    	let div13;
    	let div12;
    	let div0;
    	let img0;
    	let img0_src_value;
    	let t0;
    	let div11;
    	let div1;
    	let t2;
    	let div2;
    	let t4;
    	let div3;
    	let img1;
    	let img1_src_value;
    	let t5;
    	let div10;
    	let div9;
    	let div8;
    	let div7;
    	let div6;
    	let div4;
    	let span0;
    	let t7;
    	let div5;
    	let span1;
    	let t9;
    	let p0;
    	let t11;
    	let button0;
    	let t13;
    	let section1;
    	let div34;
    	let div17;
    	let div16;
    	let div15;
    	let span2;
    	let img2;
    	let img2_src_value;
    	let t14;
    	let div14;
    	let t16;
    	let div21;
    	let div18;
    	let h30;
    	let t17;
    	let br0;
    	let t18;
    	let span3;
    	let t20;
    	let p1;
    	let t22;
    	let div20;
    	let div19;
    	let img3;
    	let img3_src_value;
    	let t23;
    	let div25;
    	let div22;
    	let h31;
    	let t24;
    	let br1;
    	let t25;
    	let span4;
    	let t27;
    	let p2;
    	let t29;
    	let div24;
    	let div23;
    	let img4;
    	let img4_src_value;
    	let t30;
    	let div29;
    	let div26;
    	let h32;
    	let t31;
    	let br2;
    	let t32;
    	let span5;
    	let t34;
    	let p3;
    	let t36;
    	let div28;
    	let div27;
    	let img5;
    	let img5_src_value;
    	let t37;
    	let div33;
    	let div30;
    	let h33;
    	let t38;
    	let br3;
    	let t39;
    	let span6;
    	let t41;
    	let p4;
    	let t43;
    	let div32;
    	let div31;
    	let img6;
    	let img6_src_value;
    	let t44;
    	let section2;
    	let div42;
    	let div41;
    	let div36;
    	let div35;
    	let img7;
    	let img7_src_value;
    	let t45;
    	let div40;
    	let h34;
    	let t47;
    	let div37;
    	let t49;
    	let div38;
    	let t51;
    	let div39;
    	let button1;
    	let t53;
    	let button2;
    	let img8;
    	let img8_src_value;
    	let t54;

    	const block = {
    		c: function create() {
    			section0 = element("section");
    			div13 = element("div");
    			div12 = element("div");
    			div0 = element("div");
    			img0 = element("img");
    			t0 = space();
    			div11 = element("div");
    			div1 = element("div");
    			div1.textContent = "어떤 OTT를 볼지 고민하지 말고";
    			t2 = space();
    			div2 = element("div");
    			div2.textContent = "그냥 전부 보세요!";
    			t4 = space();
    			div3 = element("div");
    			img1 = element("img");
    			t5 = space();
    			div10 = element("div");
    			div9 = element("div");
    			div8 = element("div");
    			div7 = element("div");
    			div6 = element("div");
    			div4 = element("div");
    			span0 = element("span");
    			span0.textContent = "5개 OTT를 모두 보는데";
    			t7 = space();
    			div5 = element("div");
    			span1 = element("span");
    			span1.textContent = "16,900원";
    			t9 = space();
    			p0 = element("p");
    			p0.textContent = "직접 공유하는 파티장 가격";
    			t11 = space();
    			button0 = element("button");
    			button0.textContent = "바로 알아보기";
    			t13 = space();
    			section1 = element("section");
    			div34 = element("div");
    			div17 = element("div");
    			div16 = element("div");
    			div15 = element("div");
    			span2 = element("span");
    			img2 = element("img");
    			t14 = space();
    			div14 = element("div");
    			div14.textContent = "에브리뷰에서는 이런게 특별해요";
    			t16 = space();
    			div21 = element("div");
    			div18 = element("div");
    			h30 = element("h3");
    			t17 = text("내 계정을 공유하는 파티장은");
    			br0 = element("br");
    			t18 = space();
    			span3 = element("span");
    			span3.textContent = "이용료를 더 적게 부담해요";
    			t20 = space();
    			p1 = element("p");
    			p1.textContent = "파티원을 관리하는 파티장은 이용료 혜택이 있어야죠!";
    			t22 = space();
    			div20 = element("div");
    			div19 = element("div");
    			img3 = element("img");
    			t23 = space();
    			div25 = element("div");
    			div22 = element("div");
    			h31 = element("h3");
    			t24 = text("꼭 최고화질일 필요 있나요?");
    			br1 = element("br");
    			t25 = space();
    			span4 = element("span");
    			span4.textContent = "원하는 화질로 보세요";
    			t27 = space();
    			p2 = element("p");
    			p2.textContent = "스탠다드 화질로 이용하면 당연히 더 저렴해요!";
    			t29 = space();
    			div24 = element("div");
    			div23 = element("div");
    			img4 = element("img");
    			t30 = space();
    			div29 = element("div");
    			div26 = element("div");
    			h32 = element("h3");
    			t31 = text("보고싶은 OTT 선택만 하세요");
    			br2 = element("br");
    			t32 = space();
    			span5 = element("span");
    			span5.textContent = "나머지는 에브리뷰가 해요";
    			t34 = space();
    			p3 = element("p");
    			p3.textContent = "파티원 모집도, 원하는 파티를 찾는 것도, 에브리뷰가 해드려요!";
    			t36 = space();
    			div28 = element("div");
    			div27 = element("div");
    			img5 = element("img");
    			t37 = space();
    			div33 = element("div");
    			div30 = element("div");
    			h33 = element("h3");
    			t38 = text("부담갖지 마세요");
    			br3 = element("br");
    			t39 = space();
    			span6 = element("span");
    			span6.textContent = "이용한 만큼만 결제되니까요";
    			t41 = space();
    			p4 = element("p");
    			p4.textContent = "언제든지 나가세요. 이용하지 않은 기간은 100% 환불을 보장해요!";
    			t43 = space();
    			div32 = element("div");
    			div31 = element("div");
    			img6 = element("img");
    			t44 = space();
    			section2 = element("section");
    			div42 = element("div");
    			div41 = element("div");
    			div36 = element("div");
    			div35 = element("div");
    			img7 = element("img");
    			t45 = space();
    			div40 = element("div");
    			h34 = element("h3");
    			h34.textContent = "이 좋은 걸 혼자만 알고 계시려구요?";
    			t47 = space();
    			div37 = element("div");
    			div37.textContent = "무조건 고맙게 생각할";
    			t49 = space();
    			div38 = element("div");
    			div38.textContent = "에브리뷰 공유하기";
    			t51 = space();
    			div39 = element("div");
    			button1 = element("button");
    			button1.textContent = "url 복사";
    			t53 = space();
    			button2 = element("button");
    			img8 = element("img");
    			t54 = text("카카오톡\r\n            공유");
    			if (!src_url_equal(img0.src, img0_src_value = "./assets/img/main/main_img.png")) attr_dev(img0, "src", img0_src_value);
    			attr_dev(img0, "class", "main-p img-fluid mw-md-150 mw-lg-100 mb-6 mb-md-0");
    			attr_dev(img0, "alt", "...");
    			attr_dev(img0, "data-aos", "zoom-in");
    			attr_dev(img0, "data-aos-delay", "100");
    			attr_dev(img0, "data-aos-duration", "700");
    			attr_dev(img0, "data-aos-easing", "ease-out-sine");
    			add_location(img0, file$2, 6, 8, 233);
    			attr_dev(div0, "class", "col-12 col-md-5 col-lg-6 order-md-2");
    			add_location(div0, file$2, 4, 6, 150);
    			attr_dev(div1, "class", "display-5 text-center text-md-start");
    			add_location(div1, file$2, 18, 8, 653);
    			attr_dev(div2, "class", "display-3 text-center text-md-start mb-5 text-secondary");
    			add_location(div2, file$2, 21, 8, 758);
    			if (!src_url_equal(img1.src, img1_src_value = "./assets/img/main/main_img.png")) attr_dev(img1, "src", img1_src_value);
    			attr_dev(img1, "class", "main-m img-fluid mw-md-150 mw-lg-100 mb-4 mb-md-0");
    			attr_dev(img1, "alt", "...");
    			attr_dev(img1, "data-aos", "fade-up");
    			add_location(img1, file$2, 26, 10, 962);
    			attr_dev(div3, "class", "col-12 col-md-5 col-lg-6 order-md-2");
    			add_location(div3, file$2, 24, 8, 875);
    			attr_dev(span0, "class", "h5 text-uppercase text-white");
    			add_location(span0, file$2, 45, 20, 1660);
    			attr_dev(div4, "class", "text-center mt-2");
    			add_location(div4, file$2, 44, 18, 1608);
    			attr_dev(span1, "class", "text-white display-2 mb-4");
    			add_location(span1, file$2, 52, 20, 1928);
    			attr_dev(div5, "class", "d-flex justify-content-center text-white");
    			add_location(div5, file$2, 51, 18, 1852);
    			attr_dev(p0, "class", "text-center text-white mb-5 display-8");
    			add_location(p0, file$2, 56, 18, 2063);
    			attr_dev(button0, "href", "#");
    			attr_dev(button0, "class", "fw-bold card-btn btn-lg w-100 btn-secondary fs-4");
    			add_location(button0, file$2, 60, 18, 2194);
    			attr_dev(div6, "class", "col-12 ");
    			add_location(div6, file$2, 42, 16, 1533);
    			attr_dev(div7, "class", "row justify-content-center");
    			add_location(div7, file$2, 41, 14, 1475);
    			attr_dev(div8, "class", "card-body");
    			add_location(div8, file$2, 40, 12, 1436);
    			attr_dev(div9, "class", "card rounded-lg shadow-lg mb-6 mb-md-0 bg-primary");
    			set_style(div9, "z-index", "1");
    			attr_dev(div9, "data-aos", "fade-up");
    			add_location(div9, file$2, 34, 10, 1242);
    			attr_dev(div10, "class", "main-box text-center text-md-start");
    			add_location(div10, file$2, 33, 8, 1182);
    			attr_dev(div11, "class", "col-12 col-md-7 col-lg-5 order-md-1");
    			attr_dev(div11, "data-aos", "fade-up");
    			add_location(div11, file$2, 16, 6, 549);
    			attr_dev(div12, "class", "row align-items-center justify-content-between");
    			add_location(div12, file$2, 3, 4, 82);
    			attr_dev(div13, "class", "container");
    			add_location(div13, file$2, 2, 2, 53);
    			attr_dev(section0, "class", "pt-6 pt-md-11");
    			add_location(section0, file$2, 1, 0, 18);
    			if (!src_url_equal(img2.src, img2_src_value = "./assets/img/emoji/star.png")) attr_dev(img2, "src", img2_src_value);
    			attr_dev(img2, "class", "me-1 emoji");
    			attr_dev(img2, "alt", "...");
    			add_location(img2, file$2, 87, 13, 2913);
    			add_location(span2, file$2, 86, 10, 2893);
    			attr_dev(div14, "class", "display-5");
    			add_location(div14, file$2, 94, 10, 3100);
    			attr_dev(div15, "class", "d-flex align-items-center justify-content-center mb-6 mb-sm-8");
    			add_location(div15, file$2, 83, 8, 2785);
    			attr_dev(div16, "class", "col-12 col-md-10 col-lg-8 text-center");
    			add_location(div16, file$2, 82, 6, 2724);
    			attr_dev(div17, "class", "row justify-content-center");
    			add_location(div17, file$2, 81, 4, 2676);
    			add_location(br0, file$2, 106, 25, 3452);
    			attr_dev(span3, "class", "display-5 text-primary");
    			add_location(span3, file$2, 107, 10, 3470);
    			add_location(h30, file$2, 105, 8, 3421);
    			attr_dev(p1, "class", "text-muted mb-0");
    			add_location(p1, file$2, 109, 8, 3553);
    			attr_dev(div18, "class", "col-12 col-md-7 order-md-2 card_main");
    			attr_dev(div18, "data-aos", "fade-left");
    			add_location(div18, file$2, 103, 6, 3314);
    			if (!src_url_equal(img3.src, img3_src_value = "./assets/img/main/main_1.png")) attr_dev(img3, "src", img3_src_value);
    			attr_dev(img3, "class", "img-fluid mb-4 mb-md-0 main_img");
    			attr_dev(img3, "alt", "...");
    			attr_dev(img3, "data-aos", "fade-up");
    			attr_dev(img3, "data-aos-delay", "100");
    			add_location(img3, file$2, 117, 10, 3861);
    			attr_dev(div19, "class", "d-flex align-items-center justify-content-center");
    			add_location(div19, file$2, 115, 8, 3761);
    			attr_dev(div20, "class", "col-12 col-md-5 col-lg-3 order-md-1 ");
    			attr_dev(div20, "data-aos", "fade-right");
    			add_location(div20, file$2, 113, 6, 3656);
    			attr_dev(div21, "class", "d-flex align-items-center justify-content-between mb-8 main-con");
    			add_location(div21, file$2, 100, 4, 3216);
    			add_location(br1, file$2, 134, 25, 4373);
    			attr_dev(span4, "class", "display-5 text-primary");
    			add_location(span4, file$2, 135, 10, 4391);
    			add_location(h31, file$2, 133, 8, 4342);
    			attr_dev(p2, "class", "text-muted mb-0");
    			add_location(p2, file$2, 137, 8, 4471);
    			attr_dev(div22, "class", "col-12 col-md-7 col-lg-7 card_main");
    			attr_dev(div22, "data-aos", "fade-right");
    			add_location(div22, file$2, 131, 6, 4236);
    			if (!src_url_equal(img4.src, img4_src_value = "./assets/img/main/main_2.png")) attr_dev(img4, "src", img4_src_value);
    			attr_dev(img4, "class", "img-fluid mb-4 mb-md-0 main_img");
    			attr_dev(img4, "alt", "...");
    			add_location(img4, file$2, 144, 10, 4740);
    			attr_dev(div23, "class", "d-flex align-items-center justify-content-center");
    			add_location(div23, file$2, 142, 8, 4640);
    			attr_dev(div24, "class", "col-12 col-md-5 col-lg-3");
    			attr_dev(div24, "data-aos", "fade-left");
    			add_location(div24, file$2, 141, 6, 4571);
    			attr_dev(div25, "class", "d-flex align-items-center justify-content-between mb-8 main-con");
    			add_location(div25, file$2, 128, 4, 4138);
    			add_location(br2, file$2, 159, 26, 5188);
    			attr_dev(span5, "class", "display-5 text-primary");
    			add_location(span5, file$2, 160, 10, 5206);
    			add_location(h32, file$2, 158, 8, 5156);
    			attr_dev(p3, "class", "text-muted mb-0");
    			add_location(p3, file$2, 163, 8, 5290);
    			attr_dev(div26, "class", "col-12 col-md-7 order-md-2 card_main");
    			attr_dev(div26, "data-aos", "fade-left");
    			add_location(div26, file$2, 156, 6, 5049);
    			if (!src_url_equal(img5.src, img5_src_value = "./assets/img/main/main_3.png")) attr_dev(img5, "src", img5_src_value);
    			attr_dev(img5, "class", "img-fluid mb-4 mb-md-0 main_img");
    			attr_dev(img5, "alt", "...");
    			attr_dev(img5, "data-aos", "fade-up");
    			attr_dev(img5, "data-aos-delay", "100");
    			add_location(img5, file$2, 170, 10, 5570);
    			attr_dev(div27, "class", "d-flex align-items-center justify-content-center");
    			add_location(div27, file$2, 168, 8, 5470);
    			attr_dev(div28, "class", "col-12 col-md-5 col-lg-3");
    			attr_dev(div28, "data-aos", "fade-right");
    			add_location(div28, file$2, 167, 6, 5400);
    			attr_dev(div29, "class", "d-flex align-items-center justify-content-between mb-8 main-con");
    			add_location(div29, file$2, 153, 4, 4951);
    			add_location(br3, file$2, 187, 18, 6076);
    			attr_dev(span6, "class", "display-5 text-primary");
    			add_location(span6, file$2, 188, 10, 6094);
    			add_location(h33, file$2, 186, 8, 6052);
    			attr_dev(p4, "class", "text-muted mb-0");
    			add_location(p4, file$2, 192, 8, 6202);
    			attr_dev(div30, "class", "col-12 col-md-7 col-lg-7 card_main ");
    			attr_dev(div30, "data-aos", "fade-right");
    			add_location(div30, file$2, 184, 6, 5945);
    			if (!src_url_equal(img6.src, img6_src_value = "./assets/img/main/main_4.png")) attr_dev(img6, "src", img6_src_value);
    			attr_dev(img6, "class", "img-fluid mb-4 mb-md-0 main_img");
    			attr_dev(img6, "alt", "...");
    			add_location(img6, file$2, 199, 10, 6494);
    			attr_dev(div31, "class", "d-flex align-items-center justify-content-center");
    			add_location(div31, file$2, 197, 8, 6394);
    			attr_dev(div32, "class", "col-12 col-md-5 col-lg-3 order-md-1");
    			attr_dev(div32, "data-aos", "fade-left");
    			add_location(div32, file$2, 196, 6, 6314);
    			attr_dev(div33, "class", "d-flex align-items-center justify-content-between mb-6 main-con");
    			add_location(div33, file$2, 181, 4, 5847);
    			attr_dev(div34, "class", "container ");
    			add_location(div34, file$2, 80, 2, 2646);
    			attr_dev(section1, "class", "pt-9 mt-sm-8");
    			add_location(section1, file$2, 79, 0, 2612);
    			if (!src_url_equal(img7.src, img7_src_value = "./assets/img/main/share.png")) attr_dev(img7, "src", img7_src_value);
    			attr_dev(img7, "class", "img-fluid mb-6 mb-md-0 main_img");
    			attr_dev(img7, "alt", "...");
    			attr_dev(img7, "data-aos", "fade-up");
    			attr_dev(img7, "data-aos-delay", "100");
    			add_location(img7, file$2, 216, 10, 7057);
    			attr_dev(div35, "class", "d-flex align-items-center justify-content-center");
    			add_location(div35, file$2, 214, 8, 6957);
    			attr_dev(div36, "class", "col-12 col-md-5 col-lg-4");
    			attr_dev(div36, "data-aos", "fade-right");
    			add_location(div36, file$2, 213, 6, 6887);
    			add_location(h34, file$2, 227, 8, 7399);
    			attr_dev(div37, "class", "display-4 text-black fw-bold");
    			add_location(div37, file$2, 228, 8, 7438);
    			attr_dev(div38, "class", "display-4 text-primary fw-bold");
    			add_location(div38, file$2, 229, 8, 7507);
    			attr_dev(button1, "class", "btn btn-gray mt-6 me-lg-4");
    			add_location(button1, file$2, 231, 10, 7618);
    			if (!src_url_equal(img8.src, img8_src_value = "./assets/img/kakao.svg")) attr_dev(img8, "src", img8_src_value);
    			attr_dev(img8, "class", "me-2");
    			attr_dev(img8, "alt", "...");
    			add_location(img8, file$2, 233, 12, 7741);
    			attr_dev(button2, "class", "btn btn-kakao mt-6 ");
    			add_location(button2, file$2, 232, 10, 7690);
    			attr_dev(div39, "class", "d-flex share-btn");
    			add_location(div39, file$2, 230, 8, 7576);
    			attr_dev(div40, "class", "col-12 col-md-7 main-share");
    			attr_dev(div40, "data-aos", "fade-left");
    			add_location(div40, file$2, 225, 6, 7302);
    			attr_dev(div41, "class", "row align-items-center justify-content-between mb-8 px-lg-9");
    			add_location(div41, file$2, 212, 4, 6806);
    			attr_dev(div42, "class", "container");
    			add_location(div42, file$2, 211, 2, 6777);
    			attr_dev(section2, "class", "pt-8 pt-md-11 mb-10 mb-sm-12");
    			add_location(section2, file$2, 210, 0, 6727);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, section0, anchor);
    			append_dev(section0, div13);
    			append_dev(div13, div12);
    			append_dev(div12, div0);
    			append_dev(div0, img0);
    			append_dev(div12, t0);
    			append_dev(div12, div11);
    			append_dev(div11, div1);
    			append_dev(div11, t2);
    			append_dev(div11, div2);
    			append_dev(div11, t4);
    			append_dev(div11, div3);
    			append_dev(div3, img1);
    			append_dev(div11, t5);
    			append_dev(div11, div10);
    			append_dev(div10, div9);
    			append_dev(div9, div8);
    			append_dev(div8, div7);
    			append_dev(div7, div6);
    			append_dev(div6, div4);
    			append_dev(div4, span0);
    			append_dev(div6, t7);
    			append_dev(div6, div5);
    			append_dev(div5, span1);
    			append_dev(div6, t9);
    			append_dev(div6, p0);
    			append_dev(div6, t11);
    			append_dev(div6, button0);
    			insert_dev(target, t13, anchor);
    			insert_dev(target, section1, anchor);
    			append_dev(section1, div34);
    			append_dev(div34, div17);
    			append_dev(div17, div16);
    			append_dev(div16, div15);
    			append_dev(div15, span2);
    			append_dev(span2, img2);
    			append_dev(div15, t14);
    			append_dev(div15, div14);
    			append_dev(div34, t16);
    			append_dev(div34, div21);
    			append_dev(div21, div18);
    			append_dev(div18, h30);
    			append_dev(h30, t17);
    			append_dev(h30, br0);
    			append_dev(h30, t18);
    			append_dev(h30, span3);
    			append_dev(div18, t20);
    			append_dev(div18, p1);
    			append_dev(div21, t22);
    			append_dev(div21, div20);
    			append_dev(div20, div19);
    			append_dev(div19, img3);
    			append_dev(div34, t23);
    			append_dev(div34, div25);
    			append_dev(div25, div22);
    			append_dev(div22, h31);
    			append_dev(h31, t24);
    			append_dev(h31, br1);
    			append_dev(h31, t25);
    			append_dev(h31, span4);
    			append_dev(div22, t27);
    			append_dev(div22, p2);
    			append_dev(div25, t29);
    			append_dev(div25, div24);
    			append_dev(div24, div23);
    			append_dev(div23, img4);
    			append_dev(div34, t30);
    			append_dev(div34, div29);
    			append_dev(div29, div26);
    			append_dev(div26, h32);
    			append_dev(h32, t31);
    			append_dev(h32, br2);
    			append_dev(h32, t32);
    			append_dev(h32, span5);
    			append_dev(div26, t34);
    			append_dev(div26, p3);
    			append_dev(div29, t36);
    			append_dev(div29, div28);
    			append_dev(div28, div27);
    			append_dev(div27, img5);
    			append_dev(div34, t37);
    			append_dev(div34, div33);
    			append_dev(div33, div30);
    			append_dev(div30, h33);
    			append_dev(h33, t38);
    			append_dev(h33, br3);
    			append_dev(h33, t39);
    			append_dev(h33, span6);
    			append_dev(div30, t41);
    			append_dev(div30, p4);
    			append_dev(div33, t43);
    			append_dev(div33, div32);
    			append_dev(div32, div31);
    			append_dev(div31, img6);
    			insert_dev(target, t44, anchor);
    			insert_dev(target, section2, anchor);
    			append_dev(section2, div42);
    			append_dev(div42, div41);
    			append_dev(div41, div36);
    			append_dev(div36, div35);
    			append_dev(div35, img7);
    			append_dev(div41, t45);
    			append_dev(div41, div40);
    			append_dev(div40, h34);
    			append_dev(div40, t47);
    			append_dev(div40, div37);
    			append_dev(div40, t49);
    			append_dev(div40, div38);
    			append_dev(div40, t51);
    			append_dev(div40, div39);
    			append_dev(div39, button1);
    			append_dev(div39, t53);
    			append_dev(div39, button2);
    			append_dev(button2, img8);
    			append_dev(button2, t54);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(section0);
    			if (detaching) detach_dev(t13);
    			if (detaching) detach_dev(section1);
    			if (detaching) detach_dev(t44);
    			if (detaching) detach_dev(section2);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$2.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$2($$self, $$props) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Index', slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Index> was created with unknown prop '${key}'`);
    	});

    	return [];
    }

    class Index extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$2, create_fragment$2, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Index",
    			options,
    			id: create_fragment$2.name
    		});
    	}
    }

    /* src\component\page\MyParty.svelte generated by Svelte v3.49.0 */

    const file$1 = "src\\component\\page\\MyParty.svelte";

    function create_fragment$1(ctx) {
    	let section2;
    	let div70;
    	let div69;
    	let div68;
    	let div0;
    	let h1;
    	let t1;
    	let div5;
    	let div1;
    	let button0;
    	let t2;
    	let button1;
    	let t3;
    	let div4;
    	let div2;
    	let img0;
    	let img0_src_value;
    	let t4;
    	let img1;
    	let img1_src_value;
    	let t5;
    	let div3;
    	let img2;
    	let img2_src_value;
    	let t6;
    	let img3;
    	let img3_src_value;
    	let t7;
    	let button2;
    	let span0;
    	let t8;
    	let span1;
    	let t10;
    	let button3;
    	let span2;
    	let t11;
    	let span3;
    	let t13;
    	let section0;
    	let div41;
    	let div39;
    	let div16;
    	let div14;
    	let div9;
    	let div8;
    	let div6;
    	let img4;
    	let img4_src_value;
    	let t14;
    	let div7;
    	let t16;
    	let div13;
    	let div10;
    	let t18;
    	let div11;
    	let img5;
    	let img5_src_value;
    	let t19;
    	let t20;
    	let div12;
    	let t22;
    	let div15;
    	let i0;
    	let t23;
    	let div27;
    	let div25;
    	let div20;
    	let div19;
    	let div17;
    	let img6;
    	let img6_src_value;
    	let t24;
    	let div18;
    	let t26;
    	let div24;
    	let div21;
    	let t28;
    	let div22;
    	let img7;
    	let img7_src_value;
    	let t29;
    	let t30;
    	let div23;
    	let t32;
    	let div26;
    	let i1;
    	let t33;
    	let div37;
    	let div35;
    	let div31;
    	let div30;
    	let div28;
    	let img8;
    	let img8_src_value;
    	let t34;
    	let div29;
    	let t36;
    	let div34;
    	let div32;
    	let t38;
    	let div33;
    	let t40;
    	let div36;
    	let i2;
    	let t41;
    	let div38;
    	let t42;
    	let div40;
    	let t43;
    	let section1;
    	let div67;
    	let div42;
    	let t45;
    	let div64;
    	let div49;
    	let div47;
    	let div45;
    	let div43;
    	let img9;
    	let img9_src_value;
    	let t46;
    	let div44;
    	let t48;
    	let div46;
    	let t50;
    	let div48;
    	let t52;
    	let div55;
    	let div53;
    	let div52;
    	let div50;
    	let img10;
    	let img10_src_value;
    	let t53;
    	let div51;
    	let t55;
    	let div54;
    	let t57;
    	let div62;
    	let div60;
    	let div58;
    	let div56;
    	let img11;
    	let img11_src_value;
    	let t58;
    	let div57;
    	let t60;
    	let div59;
    	let t62;
    	let div61;
    	let t64;
    	let div63;
    	let t65;
    	let div66;
    	let div65;
    	let t66;
    	let span4;
    	let t68;
    	let t69;
    	let div77;
    	let div76;
    	let div75;
    	let div73;
    	let div72;
    	let div71;
    	let t71;
    	let button4;
    	let i3;
    	let t72;
    	let div74;

    	const block = {
    		c: function create() {
    			section2 = element("section");
    			div70 = element("div");
    			div69 = element("div");
    			div68 = element("div");
    			div0 = element("div");
    			h1 = element("h1");
    			h1.textContent = "내파티";
    			t1 = space();
    			div5 = element("div");
    			div1 = element("div");
    			button0 = element("button");
    			t2 = space();
    			button1 = element("button");
    			t3 = space();
    			div4 = element("div");
    			div2 = element("div");
    			img0 = element("img");
    			t4 = space();
    			img1 = element("img");
    			t5 = space();
    			div3 = element("div");
    			img2 = element("img");
    			t6 = space();
    			img3 = element("img");
    			t7 = space();
    			button2 = element("button");
    			span0 = element("span");
    			t8 = space();
    			span1 = element("span");
    			span1.textContent = "Previous";
    			t10 = space();
    			button3 = element("button");
    			span2 = element("span");
    			t11 = space();
    			span3 = element("span");
    			span3.textContent = "Next";
    			t13 = space();
    			section0 = element("section");
    			div41 = element("div");
    			div39 = element("div");
    			div16 = element("div");
    			div14 = element("div");
    			div9 = element("div");
    			div8 = element("div");
    			div6 = element("div");
    			img4 = element("img");
    			t14 = space();
    			div7 = element("div");
    			div7.textContent = "넷플릭스";
    			t16 = space();
    			div13 = element("div");
    			div10 = element("div");
    			div10.textContent = "파티장";
    			t18 = space();
    			div11 = element("div");
    			img5 = element("img");
    			t19 = text("프리미엄");
    			t20 = space();
    			div12 = element("div");
    			div12.textContent = "매칭중";
    			t22 = space();
    			div15 = element("div");
    			i0 = element("i");
    			t23 = space();
    			div27 = element("div");
    			div25 = element("div");
    			div20 = element("div");
    			div19 = element("div");
    			div17 = element("div");
    			img6 = element("img");
    			t24 = space();
    			div18 = element("div");
    			div18.textContent = "웨이브";
    			t26 = space();
    			div24 = element("div");
    			div21 = element("div");
    			div21.textContent = "파티원";
    			t28 = space();
    			div22 = element("div");
    			img7 = element("img");
    			t29 = text("프리미엄");
    			t30 = space();
    			div23 = element("div");
    			div23.textContent = "매칭중";
    			t32 = space();
    			div26 = element("div");
    			i1 = element("i");
    			t33 = space();
    			div37 = element("div");
    			div35 = element("div");
    			div31 = element("div");
    			div30 = element("div");
    			div28 = element("div");
    			img8 = element("img");
    			t34 = space();
    			div29 = element("div");
    			div29.textContent = "티빙";
    			t36 = space();
    			div34 = element("div");
    			div32 = element("div");
    			div32.textContent = "파티장";
    			t38 = space();
    			div33 = element("div");
    			div33.textContent = "스탠다드";
    			t40 = space();
    			div36 = element("div");
    			i2 = element("i");
    			t41 = space();
    			div38 = element("div");
    			t42 = space();
    			div40 = element("div");
    			t43 = space();
    			section1 = element("section");
    			div67 = element("div");
    			div42 = element("div");
    			div42.textContent = "아직 이용하고 있지 않은 OTT";
    			t45 = space();
    			div64 = element("div");
    			div49 = element("div");
    			div47 = element("div");
    			div45 = element("div");
    			div43 = element("div");
    			img9 = element("img");
    			t46 = space();
    			div44 = element("div");
    			div44.textContent = "왓챠";
    			t48 = space();
    			div46 = element("div");
    			div46.textContent = "즉시매칭가능";
    			t50 = space();
    			div48 = element("div");
    			div48.textContent = "월 3,500원~";
    			t52 = space();
    			div55 = element("div");
    			div53 = element("div");
    			div52 = element("div");
    			div50 = element("div");
    			img10 = element("img");
    			t53 = space();
    			div51 = element("div");
    			div51.textContent = "디즈니+";
    			t55 = space();
    			div54 = element("div");
    			div54.textContent = "월 2,700원~";
    			t57 = space();
    			div62 = element("div");
    			div60 = element("div");
    			div58 = element("div");
    			div56 = element("div");
    			img11 = element("img");
    			t58 = space();
    			div57 = element("div");
    			div57.textContent = "라프텔";
    			t60 = space();
    			div59 = element("div");
    			div59.textContent = "즉시매칭가능";
    			t62 = space();
    			div61 = element("div");
    			div61.textContent = "월 2,800원~";
    			t64 = space();
    			div63 = element("div");
    			t65 = space();
    			div66 = element("div");
    			div65 = element("div");
    			t66 = text("※ 이용하지 않는 OTT를 ");
    			span4 = element("span");
    			span4.textContent = "전부 이용하는데 N원";
    			t68 = text("이면 돼요! (수수료별도)");
    			t69 = space();
    			div77 = element("div");
    			div76 = element("div");
    			div75 = element("div");
    			div73 = element("div");
    			div72 = element("div");
    			div71 = element("div");
    			div71.textContent = "파티만들기";
    			t71 = space();
    			button4 = element("button");
    			i3 = element("i");
    			t72 = space();
    			div74 = element("div");
    			attr_dev(h1, "class", "fw-bold mb-0 text-dark");
    			add_location(h1, file$1, 7, 10, 245);
    			attr_dev(div0, "class", "d-flex justify-content-center mb-6 mb-md-8");
    			add_location(div0, file$1, 5, 8, 149);
    			attr_dev(button0, "type", "button");
    			attr_dev(button0, "data-bs-target", "#event-banner");
    			attr_dev(button0, "data-bs-slide-to", "0");
    			attr_dev(button0, "class", "active");
    			attr_dev(button0, "aria-current", "true");
    			attr_dev(button0, "aria-label", "Slide 1");
    			add_location(button0, file$1, 17, 12, 548);
    			attr_dev(button1, "type", "button");
    			attr_dev(button1, "data-bs-target", "#event-banner");
    			attr_dev(button1, "data-bs-slide-to", "1");
    			attr_dev(button1, "aria-label", "Slide 2");
    			add_location(button1, file$1, 25, 12, 797);
    			attr_dev(div1, "class", "carousel-indicators");
    			add_location(div1, file$1, 16, 10, 501);
    			if (!src_url_equal(img0.src, img0_src_value = "./assets/img/sub/banner_1.png")) attr_dev(img0, "src", img0_src_value);
    			attr_dev(img0, "class", "w-100 banner-w");
    			attr_dev(img0, "alt", "banner");
    			add_location(img0, file$1, 34, 14, 1113);
    			if (!src_url_equal(img1.src, img1_src_value = "./assets/img/sub/banner_1_m.png")) attr_dev(img1, "src", img1_src_value);
    			attr_dev(img1, "class", "w-100 banner-m");
    			attr_dev(img1, "alt", "banner");
    			add_location(img1, file$1, 39, 14, 1274);
    			attr_dev(div2, "class", "carousel-item active");
    			attr_dev(div2, "data-bs-interval", "3000");
    			add_location(div2, file$1, 33, 12, 1039);
    			if (!src_url_equal(img2.src, img2_src_value = "./assets/img/sub/banner_2.png")) attr_dev(img2, "src", img2_src_value);
    			attr_dev(img2, "class", "w-100 banner-w");
    			attr_dev(img2, "alt", "banner");
    			add_location(img2, file$1, 46, 14, 1522);
    			if (!src_url_equal(img3.src, img3_src_value = "./assets/img/sub/banner_2_m.png")) attr_dev(img3, "src", img3_src_value);
    			attr_dev(img3, "class", "w-100 banner-m");
    			attr_dev(img3, "alt", "banner");
    			add_location(img3, file$1, 51, 14, 1683);
    			attr_dev(div3, "class", "carousel-item");
    			attr_dev(div3, "data-bs-interval", "3000");
    			add_location(div3, file$1, 45, 12, 1455);
    			attr_dev(div4, "class", "carousel-inner");
    			add_location(div4, file$1, 32, 10, 997);
    			attr_dev(span0, "class", "carousel-control-prev-icon");
    			attr_dev(span0, "aria-hidden", "true");
    			add_location(span0, file$1, 64, 12, 2062);
    			attr_dev(span1, "class", "visually-hidden");
    			add_location(span1, file$1, 65, 12, 2138);
    			attr_dev(button2, "class", "carousel-control-prev");
    			attr_dev(button2, "type", "button");
    			attr_dev(button2, "data-bs-target", "#event-banner");
    			attr_dev(button2, "data-bs-slide", "prev");
    			add_location(button2, file$1, 58, 10, 1880);
    			attr_dev(span2, "class", "carousel-control-next-icon");
    			attr_dev(span2, "aria-hidden", "true");
    			add_location(span2, file$1, 73, 12, 2398);
    			attr_dev(span3, "class", "visually-hidden");
    			add_location(span3, file$1, 74, 12, 2474);
    			attr_dev(button3, "class", "carousel-control-next");
    			attr_dev(button3, "type", "button");
    			attr_dev(button3, "data-bs-target", "#event-banner");
    			attr_dev(button3, "data-bs-slide", "next");
    			add_location(button3, file$1, 67, 10, 2216);
    			attr_dev(div5, "id", "event-banner");
    			attr_dev(div5, "class", "carousel carousel-dark slide");
    			attr_dev(div5, "data-bs-ride", "carousel");
    			add_location(div5, file$1, 11, 8, 362);
    			if (!src_url_equal(img4.src, img4_src_value = "./assets/img/ott/netflix.png")) attr_dev(img4, "src", img4_src_value);
    			attr_dev(img4, "class", "ott-l me-3");
    			add_location(img4, file$1, 92, 24, 3263);
    			add_location(div6, file$1, 91, 22, 3232);
    			attr_dev(div7, "class", "fw-bold");
    			add_location(div7, file$1, 97, 22, 3457);
    			attr_dev(div8, "class", "d-flex flex-wrap align-items-center");
    			add_location(div8, file$1, 90, 20, 3159);
    			attr_dev(div9, "class", "d-flex flex-wrap justify-content-between align-items-center");
    			add_location(div9, file$1, 87, 18, 3023);
    			attr_dev(div10, "class", "tag-leader me-2");
    			add_location(div10, file$1, 101, 20, 3609);
    			if (!src_url_equal(img5.src, img5_src_value = "./assets/img/emoji/star.png")) attr_dev(img5, "src", img5_src_value);
    			attr_dev(img5, "class", "emoji_xs me-1");
    			add_location(img5, file$1, 103, 22, 3721);
    			attr_dev(div11, "class", "tag-price me-2");
    			add_location(div11, file$1, 102, 20, 3669);
    			attr_dev(div12, "class", "tag-matching");
    			add_location(div12, file$1, 108, 20, 3911);
    			attr_dev(div13, "class", "d-flex mt-4");
    			add_location(div13, file$1, 100, 18, 3562);
    			attr_dev(div14, "class", "d-flex flex-column");
    			add_location(div14, file$1, 86, 16, 2971);
    			attr_dev(i0, "class", "fa-solid fa-chevron-right");
    			add_location(i0, file$1, 111, 33, 4031);
    			attr_dev(div15, "class", "p-2");
    			add_location(div15, file$1, 111, 16, 4014);
    			attr_dev(div16, "class", "myparty-card-leader hover-white d-flex flex-wrap justify-content-between align-items-center");
    			attr_dev(div16, "onclick", "location.href='myparty-detail_leader.html'");
    			add_location(div16, file$1, 82, 14, 2745);
    			if (!src_url_equal(img6.src, img6_src_value = "./assets/img/ott/wavve.png")) attr_dev(img6, "src", img6_src_value);
    			attr_dev(img6, "class", "ott-l me-3");
    			attr_dev(img6, "alt", "웨이브");
    			add_location(img6, file$1, 124, 24, 4658);
    			add_location(div17, file$1, 123, 22, 4627);
    			attr_dev(div18, "class", "fw-bold");
    			add_location(div18, file$1, 130, 22, 4887);
    			attr_dev(div19, "class", "d-flex flex-wrap align-items-center");
    			add_location(div19, file$1, 122, 20, 4554);
    			attr_dev(div20, "class", "d-flex flex-wrap justify-content-between align-items-center");
    			add_location(div20, file$1, 119, 18, 4418);
    			attr_dev(div21, "class", "tag-member me-2");
    			add_location(div21, file$1, 134, 20, 5038);
    			if (!src_url_equal(img7.src, img7_src_value = "./assets/img/emoji/star.png")) attr_dev(img7, "src", img7_src_value);
    			attr_dev(img7, "class", "emoji_xs me-1");
    			add_location(img7, file$1, 136, 22, 5150);
    			attr_dev(div22, "class", "tag-price me-2");
    			add_location(div22, file$1, 135, 20, 5098);
    			attr_dev(div23, "class", "tag-matching");
    			add_location(div23, file$1, 141, 20, 5340);
    			attr_dev(div24, "class", "d-flex mt-4");
    			add_location(div24, file$1, 133, 18, 4991);
    			attr_dev(div25, "class", "d-flex flex-column");
    			add_location(div25, file$1, 118, 16, 4366);
    			attr_dev(i1, "class", "fa-solid fa-chevron-right");
    			add_location(i1, file$1, 144, 33, 5460);
    			attr_dev(div26, "class", "p-2");
    			add_location(div26, file$1, 144, 16, 5443);
    			attr_dev(div27, "class", "myparty-card-member hover-white d-flex flex-wrap justify-content-between align-items-center");
    			attr_dev(div27, "onclick", "location.href='myparty-detail_member.html'");
    			add_location(div27, file$1, 114, 14, 4140);
    			if (!src_url_equal(img8.src, img8_src_value = "./assets/img/ott/tiving.png")) attr_dev(img8, "src", img8_src_value);
    			attr_dev(img8, "class", "ott-l me-3");
    			attr_dev(img8, "alt", "티빙");
    			add_location(img8, file$1, 157, 24, 6087);
    			add_location(div28, file$1, 156, 22, 6056);
    			attr_dev(div29, "class", "fw-bold");
    			add_location(div29, file$1, 163, 22, 6316);
    			attr_dev(div30, "class", "d-flex flex-wrap align-items-center");
    			add_location(div30, file$1, 155, 20, 5983);
    			attr_dev(div31, "class", "d-flex flex-wrap justify-content-between align-items-center");
    			add_location(div31, file$1, 152, 18, 5847);
    			attr_dev(div32, "class", "tag-leader me-2");
    			add_location(div32, file$1, 167, 20, 6466);
    			attr_dev(div33, "class", "tag-price me-2");
    			add_location(div33, file$1, 168, 20, 6526);
    			attr_dev(div34, "class", "d-flex mt-4");
    			add_location(div34, file$1, 166, 18, 6419);
    			attr_dev(div35, "class", "d-flex flex-column");
    			add_location(div35, file$1, 151, 16, 5795);
    			attr_dev(i2, "class", "fa-solid fa-chevron-right");
    			add_location(i2, file$1, 171, 33, 6649);
    			attr_dev(div36, "class", "p-2");
    			add_location(div36, file$1, 171, 16, 6632);
    			attr_dev(div37, "class", "myparty-card-leader hover-white d-flex flex-wrap justify-content-between align-items-center");
    			attr_dev(div37, "onclick", "location.href='myparty-detail_leader.html'");
    			add_location(div37, file$1, 147, 14, 5569);
    			attr_dev(div38, "class", "myparty-placeholder");
    			add_location(div38, file$1, 174, 14, 6734);
    			attr_dev(div39, "class", "d-flex justify-content-between flex-wrap mt-4 gap-4");
    			add_location(div39, file$1, 80, 12, 2638);
    			add_location(div40, file$1, 176, 12, 6803);
    			attr_dev(div41, "class", "mt-8 row flex-column mb-6");
    			add_location(div41, file$1, 79, 10, 2585);
    			add_location(section0, file$1, 78, 8, 2564);
    			attr_dev(div42, "class", "d-flex justify-content-center");
    			add_location(div42, file$1, 182, 12, 6972);
    			if (!src_url_equal(img9.src, img9_src_value = "./assets/img/ott/watcha.png")) attr_dev(img9, "src", img9_src_value);
    			attr_dev(img9, "class", "ott-l me-3");
    			add_location(img9, file$1, 192, 22, 7438);
    			add_location(div43, file$1, 191, 20, 7409);
    			attr_dev(div44, "class", "fw-bold");
    			add_location(div44, file$1, 197, 20, 7621);
    			attr_dev(div45, "class", "d-flex flex-wrap align-items-center");
    			add_location(div45, file$1, 190, 18, 7338);
    			attr_dev(div46, "class", "tag");
    			add_location(div46, file$1, 199, 18, 7696);
    			attr_dev(div47, "class", "d-flex flex-wrap justify-content-between align-items-center");
    			add_location(div47, file$1, 187, 16, 7208);
    			attr_dev(div48, "class", "price mt-4");
    			add_location(div48, file$1, 201, 16, 7767);
    			attr_dev(div49, "class", "myparty-card");
    			add_location(div49, file$1, 186, 14, 7164);
    			if (!src_url_equal(img10.src, img10_src_value = "./assets/img/ott/disney.png")) attr_dev(img10, "src", img10_src_value);
    			attr_dev(img10, "class", "ott-l me-3");
    			add_location(img10, file$1, 209, 22, 8118);
    			add_location(div50, file$1, 208, 20, 8089);
    			attr_dev(div51, "class", "fw-bold");
    			add_location(div51, file$1, 214, 20, 8301);
    			attr_dev(div52, "class", "d-flex flex-wrap align-items-center");
    			add_location(div52, file$1, 207, 18, 8018);
    			attr_dev(div53, "class", "d-flex flex-wrap justify-content-between align-items-center");
    			add_location(div53, file$1, 204, 16, 7888);
    			attr_dev(div54, "class", "price mt-4");
    			add_location(div54, file$1, 218, 16, 8456);
    			attr_dev(div55, "class", "myparty-card");
    			add_location(div55, file$1, 203, 14, 7844);
    			if (!src_url_equal(img11.src, img11_src_value = "./assets/img/ott/laftel.png")) attr_dev(img11, "src", img11_src_value);
    			attr_dev(img11, "class", "ott-l me-3");
    			add_location(img11, file$1, 226, 22, 8807);
    			add_location(div56, file$1, 225, 20, 8778);
    			attr_dev(div57, "class", "fw-bold");
    			add_location(div57, file$1, 231, 20, 8990);
    			attr_dev(div58, "class", "d-flex flex-wrap align-items-center");
    			add_location(div58, file$1, 224, 18, 8707);
    			attr_dev(div59, "class", "tag");
    			add_location(div59, file$1, 233, 18, 9066);
    			attr_dev(div60, "class", "d-flex flex-wrap justify-content-between align-items-center");
    			add_location(div60, file$1, 221, 16, 8577);
    			attr_dev(div61, "class", "price mt-4");
    			add_location(div61, file$1, 235, 16, 9137);
    			attr_dev(div62, "class", "myparty-card");
    			add_location(div62, file$1, 220, 14, 8533);
    			attr_dev(div63, "class", "myparty-placeholder");
    			add_location(div63, file$1, 237, 14, 9214);
    			attr_dev(div64, "class", "d-flex justify-content-between flex-wrap mt-4 gap-4 ");
    			add_location(div64, file$1, 185, 12, 7082);
    			attr_dev(span4, "class", "fw-bold text-primary");
    			add_location(span4, file$1, 241, 31, 9368);
    			attr_dev(div65, "class", "myparty-help mt-6");
    			add_location(div65, file$1, 240, 14, 9304);
    			add_location(div66, file$1, 239, 12, 9283);
    			attr_dev(div67, "class", "mt-8 row flex-column");
    			add_location(div67, file$1, 181, 10, 6924);
    			attr_dev(section1, "class", "border-top");
    			add_location(section1, file$1, 180, 8, 6884);
    			attr_dev(div68, "class", "col-12");
    			add_location(div68, file$1, 4, 6, 119);
    			attr_dev(div69, "class", "row");
    			add_location(div69, file$1, 3, 4, 94);
    			attr_dev(div70, "class", "container");
    			add_location(div70, file$1, 2, 2, 65);
    			attr_dev(section2, "class", "pt-6 pt-md-8 pb-8 mb-md-8");
    			add_location(section2, file$1, 1, 0, 18);
    			add_location(div71, file$1, 261, 10, 9927);
    			attr_dev(div72, "class", "modal-title");
    			attr_dev(div72, "id", "staticBackdropLabel");
    			add_location(div72, file$1, 260, 8, 9865);
    			attr_dev(i3, "class", "fa-solid fa-xmark");
    			add_location(i3, file$1, 264, 11, 10050);
    			attr_dev(button4, "class", "btn-close");
    			attr_dev(button4, "data-bs-dismiss", "modal");
    			attr_dev(button4, "aria-label", "Close");
    			add_location(button4, file$1, 263, 8, 9969);
    			attr_dev(div73, "class", "modal-header");
    			add_location(div73, file$1, 259, 6, 9829);
    			attr_dev(div74, "class", "modal-body");
    			add_location(div74, file$1, 267, 6, 10122);
    			attr_dev(div75, "class", "modal-content");
    			add_location(div75, file$1, 258, 4, 9794);
    			attr_dev(div76, "class", "modal-dialog");
    			attr_dev(div76, "role", "document");
    			add_location(div76, file$1, 257, 2, 9746);
    			attr_dev(div77, "class", "modal fade");
    			attr_dev(div77, "id", "leader-modal");
    			attr_dev(div77, "tabindex", "-1");
    			attr_dev(div77, "role", "dialog");
    			add_location(div77, file$1, 256, 0, 9672);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, section2, anchor);
    			append_dev(section2, div70);
    			append_dev(div70, div69);
    			append_dev(div69, div68);
    			append_dev(div68, div0);
    			append_dev(div0, h1);
    			append_dev(div68, t1);
    			append_dev(div68, div5);
    			append_dev(div5, div1);
    			append_dev(div1, button0);
    			append_dev(div1, t2);
    			append_dev(div1, button1);
    			append_dev(div5, t3);
    			append_dev(div5, div4);
    			append_dev(div4, div2);
    			append_dev(div2, img0);
    			append_dev(div2, t4);
    			append_dev(div2, img1);
    			append_dev(div4, t5);
    			append_dev(div4, div3);
    			append_dev(div3, img2);
    			append_dev(div3, t6);
    			append_dev(div3, img3);
    			append_dev(div5, t7);
    			append_dev(div5, button2);
    			append_dev(button2, span0);
    			append_dev(button2, t8);
    			append_dev(button2, span1);
    			append_dev(div5, t10);
    			append_dev(div5, button3);
    			append_dev(button3, span2);
    			append_dev(button3, t11);
    			append_dev(button3, span3);
    			append_dev(div68, t13);
    			append_dev(div68, section0);
    			append_dev(section0, div41);
    			append_dev(div41, div39);
    			append_dev(div39, div16);
    			append_dev(div16, div14);
    			append_dev(div14, div9);
    			append_dev(div9, div8);
    			append_dev(div8, div6);
    			append_dev(div6, img4);
    			append_dev(div8, t14);
    			append_dev(div8, div7);
    			append_dev(div14, t16);
    			append_dev(div14, div13);
    			append_dev(div13, div10);
    			append_dev(div13, t18);
    			append_dev(div13, div11);
    			append_dev(div11, img5);
    			append_dev(div11, t19);
    			append_dev(div13, t20);
    			append_dev(div13, div12);
    			append_dev(div16, t22);
    			append_dev(div16, div15);
    			append_dev(div15, i0);
    			append_dev(div39, t23);
    			append_dev(div39, div27);
    			append_dev(div27, div25);
    			append_dev(div25, div20);
    			append_dev(div20, div19);
    			append_dev(div19, div17);
    			append_dev(div17, img6);
    			append_dev(div19, t24);
    			append_dev(div19, div18);
    			append_dev(div25, t26);
    			append_dev(div25, div24);
    			append_dev(div24, div21);
    			append_dev(div24, t28);
    			append_dev(div24, div22);
    			append_dev(div22, img7);
    			append_dev(div22, t29);
    			append_dev(div24, t30);
    			append_dev(div24, div23);
    			append_dev(div27, t32);
    			append_dev(div27, div26);
    			append_dev(div26, i1);
    			append_dev(div39, t33);
    			append_dev(div39, div37);
    			append_dev(div37, div35);
    			append_dev(div35, div31);
    			append_dev(div31, div30);
    			append_dev(div30, div28);
    			append_dev(div28, img8);
    			append_dev(div30, t34);
    			append_dev(div30, div29);
    			append_dev(div35, t36);
    			append_dev(div35, div34);
    			append_dev(div34, div32);
    			append_dev(div34, t38);
    			append_dev(div34, div33);
    			append_dev(div37, t40);
    			append_dev(div37, div36);
    			append_dev(div36, i2);
    			append_dev(div39, t41);
    			append_dev(div39, div38);
    			append_dev(div41, t42);
    			append_dev(div41, div40);
    			append_dev(div68, t43);
    			append_dev(div68, section1);
    			append_dev(section1, div67);
    			append_dev(div67, div42);
    			append_dev(div67, t45);
    			append_dev(div67, div64);
    			append_dev(div64, div49);
    			append_dev(div49, div47);
    			append_dev(div47, div45);
    			append_dev(div45, div43);
    			append_dev(div43, img9);
    			append_dev(div45, t46);
    			append_dev(div45, div44);
    			append_dev(div47, t48);
    			append_dev(div47, div46);
    			append_dev(div49, t50);
    			append_dev(div49, div48);
    			append_dev(div64, t52);
    			append_dev(div64, div55);
    			append_dev(div55, div53);
    			append_dev(div53, div52);
    			append_dev(div52, div50);
    			append_dev(div50, img10);
    			append_dev(div52, t53);
    			append_dev(div52, div51);
    			append_dev(div55, t55);
    			append_dev(div55, div54);
    			append_dev(div64, t57);
    			append_dev(div64, div62);
    			append_dev(div62, div60);
    			append_dev(div60, div58);
    			append_dev(div58, div56);
    			append_dev(div56, img11);
    			append_dev(div58, t58);
    			append_dev(div58, div57);
    			append_dev(div60, t60);
    			append_dev(div60, div59);
    			append_dev(div62, t62);
    			append_dev(div62, div61);
    			append_dev(div64, t64);
    			append_dev(div64, div63);
    			append_dev(div67, t65);
    			append_dev(div67, div66);
    			append_dev(div66, div65);
    			append_dev(div65, t66);
    			append_dev(div65, span4);
    			append_dev(div65, t68);
    			insert_dev(target, t69, anchor);
    			insert_dev(target, div77, anchor);
    			append_dev(div77, div76);
    			append_dev(div76, div75);
    			append_dev(div75, div73);
    			append_dev(div73, div72);
    			append_dev(div72, div71);
    			append_dev(div73, t71);
    			append_dev(div73, button4);
    			append_dev(button4, i3);
    			append_dev(div75, t72);
    			append_dev(div75, div74);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(section2);
    			if (detaching) detach_dev(t69);
    			if (detaching) detach_dev(div77);
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

    function instance$1($$self, $$props) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('MyParty', slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<MyParty> was created with unknown prop '${key}'`);
    	});

    	return [];
    }

    class MyParty extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "MyParty",
    			options,
    			id: create_fragment$1.name
    		});
    	}
    }

    var routes = {
      "/": Index,
      "/myparty": MyParty,
    };

    /* src\App.svelte generated by Svelte v3.49.0 */
    const file = "src\\App.svelte";

    function create_fragment(ctx) {
    	let main;
    	let nav;
    	let t0;
    	let router;
    	let t1;
    	let footer;
    	let current;
    	nav = new Nav({ $$inline: true });
    	router = new Router({ props: { routes }, $$inline: true });
    	footer = new Footer({ $$inline: true });

    	const block = {
    		c: function create() {
    			main = element("main");
    			create_component(nav.$$.fragment);
    			t0 = space();
    			create_component(router.$$.fragment);
    			t1 = space();
    			create_component(footer.$$.fragment);
    			add_location(main, file, 8, 0, 204);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, main, anchor);
    			mount_component(nav, main, null);
    			append_dev(main, t0);
    			mount_component(router, main, null);
    			append_dev(main, t1);
    			mount_component(footer, main, null);
    			current = true;
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;
    			transition_in(nav.$$.fragment, local);
    			transition_in(router.$$.fragment, local);
    			transition_in(footer.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(nav.$$.fragment, local);
    			transition_out(router.$$.fragment, local);
    			transition_out(footer.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(main);
    			destroy_component(nav);
    			destroy_component(router);
    			destroy_component(footer);
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

    function instance($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('App', slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({ Nav, Footer, Router, routes });
    	return [];
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

    var app = new App({
      target: document.body,
    });

    return app;

})();
//# sourceMappingURL=bundle.js.map
