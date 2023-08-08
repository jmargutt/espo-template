/*! bullbone 1.1.0 2023-06-28 */
var Bull = Bull || {};
window.Bull = Bull;

(function (Bull, _) {

    var root = this;

    /**
     * @callback viewLoader
     * @param {string} viewName,
     * @param {function(): void} callback
     */

    /**
     * A view factory.
     *
     * @class Bull.Factory
     * @param {{
     *   defaultViewName?: string,
     *   customLoader?: Object,
     *   customRenderer?: Object,
     *   customLayouter?: Object,
     *   customTemplator?: Object,
     *   helper?: Object,
     *   viewLoader?: viewLoader,
     *   resources: Object.<string, *>,
     *   rendering: Object.<string, *>,
     *   layouting: Object.<string, *>,
     *   templating: Object.<string, *>,
     * }|null} options Configuration options.
     * <ul>
     *  <li>defaultViewName: {String} Default name for views when it is not defined.</li>
     *  <li>viewLoader: {Function} Function that loads view class ({Function} in javascript)
     *  by the given view name and callback function as parameters. Here you can load js code using sync XHR request.
     *  If not defined it will look up classes in window object.</li>
     *  <li>helper: {Object} View Helper that will be injected into all views.</li>
     *  <li>resources: {Object} Resources loading options: paths, exts, loaders. Example: <br>
     *    <i>{
     *      paths: { // Custom paths for resource files.
     *        layout: 'resources/layouts',
     *        templates: 'resources/templates',
     *        layoutTemplate: 'resources/templates/layouts',
     *      },
     *      exts: { // Custom extensions of resource files.
     *        layout: 'json',
     *        templates: 'tpl',
     *      },
     *      loaders: { // Custom resources loading functions. Define it if some type of resources needs to be loaded
     *                 // via REST rather than from file.
     *        layout: function (layoutName, callback) {
     *          callback(layoutManager.getLayout(layoutName));
     *        }
     *      },
     *      path: function (type, name) {} // Custom path function. Should return path to the needed resource.
     *    }</i>
     *  </li>
     *  <li>rendering: {Object} Rendering options: method (Method is the custom function for a rendering.
     *  Define it if you want to use another templating engine. <i>Function (template, data)</i>).</li>
     *  <li>templating: {Object} Templating options: {bool} compilable (If templates are compilable (like Handlebars).
     *  True by default.)</li>
     * </ul>
     */
    Bull.Factory = function (options) {
        options = options || {};

        this.defaultViewName = options.defaultViewName || this.defaultViewName;

        this._loader = options.customLoader || new Bull.Loader(options.resources || {});
        this._renderer = options.customRenderer || new Bull.Renderer(options.rendering || {});
        this._layouter = options.customLayouter ||
            new Bull.Layouter(_.extend(options.layouting || {}, {
                loader: this._loader,
            }));
        this._templator = options.customTemplator ||
            new Bull.Templator(_.extend(options.templating || {}, {
                loader: this._loader,
                layouter: this._layouter,
            }));

        this._helper = options.helper || null;

        this._viewClassHash = {};
        this._getViewClassFunction = options.viewLoader || this._getViewClassFunction;
        this._viewLoader = this._getViewClassFunction;
    };

    _.extend(Bull.Factory.prototype, /** @lends Bull.Factory.prototype */ {

        /**
         * @private
         */
        defaultViewName: 'View',

        /**
         * @private
         */
        _layouter: null,

        /**
         * @private
         */
        _templator: null,

        /**
         * @private
         */
        _renderer: null,

        /**
         * @private
         */
        _loader: null,

        /**
         * @private
         */
        _helper: null,

        /**
         * @private
         */
        _viewClassHash: null,

        /**
         * @private
         */
        _viewLoader: null,

        /**
         * @private
         */
        _getViewClassFunction: function (viewName, callback) {
            let viewClass = root[viewName];

            if (typeof viewClass !== "function") {
                throw new Error("function \"" + viewClass + "\" not found.");
            }

            callback(viewClass);
        },

        /**
         * @private
         */
        _getViewClass: function (viewName, callback) {
            if (viewName in this._viewClassHash) {
                callback(this._viewClassHash[viewName]);

                return;
            }

            this._getViewClassFunction(viewName, (viewClass) => {
                this._viewClassHash[viewName] = viewClass;

                callback(viewClass);
            });
        },

        /**
         * Create a view.
         *
         * @param {string} viewName A view name/path.
         * @param {Bull.View~Options} [options] Options.
         * @param {Function<Bull.View>} [callback] Invoked once the view is ready.
         */
        create: function (viewName, options, callback) {
            this._getViewClass(viewName, viewClass => {
                if (typeof viewClass === 'undefined') {
                    throw new Error(`A view class '${viewName}' not found.`);
                }

                let view = new viewClass(options || {});

                view._initialize({
                    factory: this,
                    layouter: this._layouter,
                    templator: this._templator,
                    renderer: this._renderer,
                    helper: this._helper,
                    onReady: callback,
                });
            });
        },
    });

}).call(this, Bull, _);

(function (Bull, Backbone, _) {

    /**
     * View options passed to a view on creation.
     *
     * @typedef {Object.<string, *>} Bull.View~Options
     *
     * @property {string} [selector] A DOM element selector relative to a parent view.
     * @property {string} [el] A full DOM element selector.
     * @property {string[]} [optionsToPass] Options to be automatically passed to child views
     *   of the created view.
     * @property {(function: Object)|Object} [data] Data that will be passed to a template or a function
     *   that returns data.
     * @property {string} [template] A template name.
     * @property {string} [templateContent] Template content.
     * @property {Object} [layoutDefs] Internal layout defs.
     * @property {Object} [layoutData] Internal layout data.
     * @property {boolean} [notToRender] Not to render on ready.
     * @property {boolean} [noCache] Disable layout cache.
     * @property {Object} [views] Child view definitions.
     * @property {string} [name] A view name.
     * @property {Backbone.Model} [model] A model.
     * @property {Backbone.Collection} [collection] A collection.
     * @property {Bull.View.DomEvents} [events] DOM events.
     * @property {boolean} [setViewBeforeCallback] A child view will be set to a parent before a promise is resolved.
     */

    /**
     * Nested view definitions.
     *
     * @typedef {Object} Bull.View~NestedViewItem
     *
     * @property {string} view A view name/path.
     * @property {string} [selector] A DOM element selector relative to a parent view.
     * @property {string} [el] A full DOM element selector.
     */

    /**
     * After a view is rendered.
     *
     * @event Bull.View#after:render
     */

    /**
     * Once a view is ready for rendering (loaded).
     *
     * @event Bull.View#ready
     */

    /**
     * Once a view is removed.
     *
     * @event Bull.View#remove
     */

    /**
     * A get-HTML callback.
     *
     * @callback Bull.View~getHtmlCallback
     *
     * @param {string} html An HTML.
     */

    /**
     * A DOM event callback.
     *
     * @callback Bull.View~domEventCallback
     *
     * @param {jQuery.Event} e An event.
     */

    /**
     * @callback Backbone.Events~callback
     *
     * @param {...*} arguments
     */

    /**
     * @mixin Backbone.Events
     */

    /**
     * Trigger an event.
     *
     * @function trigger
     * @memberof Backbone.Events
     * @param {string} event An event.
     * @param {...*} arguments
     */

    /**
     * Subscribe to an event.
     *
     * @function on
     * @memberof Backbone.Events
     * @param {string} event An event.
     * @param {Backbone.Events~callback} callback A callback.
     */

    /**
     * Subscribe to an event. Fired once.
     *
     * @function once
     * @memberof Backbone.Events
     * @param {string} event An event.
     * @param {Backbone.Events~callback} callback A callback.
     */

    /**
     * Unsubscribe from an event or all events.
     *
     * @function off
     * @memberof Backbone.Events
     * @param {string} [event] From a specific event.
     * @param {Backbone.Events~callback} [callback] From a specific callback.
     */

    /**
     * Subscribe to an event of other object. Will be automatically unsubscribed on view removal.
     *
     * @function listenTo
     * @memberof Backbone.Events
     * @param {Object} other What to listen.
     * @param {string} event An event.
     * @param {Backbone.Events~callback} callback A callback.
     */

    /**
     * Subscribe to an event of other object. Fired once. Will be automatically unsubscribed on view removal.
     *
     * @function listenToOnce
     * @memberof Backbone.Events
     * @param {Object} other What to listen.
     * @param {string} event An event.
     * @param {Backbone.Events~callback} callback A callback.
     */

    /**
     * Stop listening to other object. No arguments will remove all listeners.
     *
     * @function stopListening
     * @memberof Backbone.Events
     * @param {Object} [other] To remove listeners to a specific object.
     * @param {string} [event] To remove listeners to a specific event.
     * @param {Backbone.Events~callback} [callback] To remove listeners to a specific callback.
     */

    /**
     * DOM event listeners.
     *
     * @typedef {Object.<string, Bull.View~domEventCallback>} Bull.View.DomEvents
     */

    /**
     * A view.
     *
     * @class Bull.View
     * @param {Object.<string, *>|null} [options]
     *
     * @mixes Backbone.Events
     */
    Bull.View = function (options) {
        this.cid = _.uniqueId('view');
        _.extend(this, _.pick(options, viewOptions));
        /** @type {JQuery} */
        this.$el = $();
        this.options = options || {};
    };

    const isEsClass = fn => {
        return typeof fn === 'function' &&
            Object.getOwnPropertyDescriptor(fn, 'prototype')?.writable === false;
    };

    Bull.View.extend = function (protoProps, staticProps) {
        let parent = this;

        let child;

        if (isEsClass(parent)) {
            let TemporaryHelperConstructor = function () {};

            child = function () {
                if (new.target) {
                    return Reflect.construct(parent, arguments, new.target);
                }

                return Reflect.construct(parent, arguments, TemporaryHelperConstructor);
            };

            _.extend(child, parent, staticProps);

            child.prototype = _.create(parent.prototype, protoProps);
            child.prototype.constructor = child;
            child.__super__ = parent.prototype;
            child.prototype.__isEs = true;

            TemporaryHelperConstructor.prototype = child.prototype;

            return child;
        }

        child = function () {
            if (parent.prototype.__isEs) {
                return Reflect.construct(parent, arguments, new.target);
            }

            return parent.apply(this, arguments);
        };

        _.extend(child, parent, staticProps);

        child.prototype = _.create(parent.prototype, protoProps);
        child.prototype.constructor = child;
        child.__super__ = parent.prototype;

        return child;
    };

    let viewOptions = [
        'model',
        'collection',
        'el',
        'id',
        'events',
    ];

    let delegateEventSplitter = /^(\S+)\s*(.*)$/;

    _.extend(Bull.View.prototype, Backbone.Events, /** @lends Bull.View.prototype */{

        /**
         * Extend the class.
         *
         * @name extend
         * @param {Object.<string, *>} proto Child prototype.
         * @return this
         * @static
         * @memberof Bull.View
         */

        /**
         * A model.
         *
         * @name model
         * @type {Backbone.Model|null}
         * @public
         * @memberof Bull.View.prototype
         */

        /**
         * A collection.
         *
         * @name collection
         * @type {Backbone.Collection|null}
         * @public
         * @memberof Bull.View.prototype
         */

        /**
         * An ID, unique among all views.
         *
         * @name cid
         * @type {string}
         * @public
         * @memberof Bull.View.prototype
         */

        /**
         * A DOM element.
         *
         * @name $el
         * @type {JQuery}
         * @public
         * @memberof Bull.View.prototype
         */

        /**
         * A DOM element.
         *
         * @name el
         * @type {Element|null}
         * @public
         * @memberof Bull.View.prototype
         */

        /**
         * Passed options.
         *
         * @name options
         * @type {Object}
         * @public
         * @memberof Bull.View.prototype
         */

        /**
         * A template name/path.
         *
         * @type {string|null}
         * @protected
         */
        template: null,

        /**
         * Template content. Alternative to specifying a template name/path.
         *
         * @type {string|null}
         * @protected
         */
        templateContent: null,

        /**
         * A layout name/path. Used if template is not specified to build template.
         *
         * @type {string|null}
         * @private
         */
        layout: null,

        /**
         * A name of the view. If template name is not defined it will be used to cache
         * built template and layout. Otherwise, they won't be cached. A name is unique.
         *
         * @type {string|null}
         */
        name: null,

        /**
         * DOM event listeners.
         *
         * @type {Bull.View.DomEvents}
         * @protected
         */
        events: null,

        /**
         * Not to use cache for layouts. Use it if layouts are dynamic.
         *
         * @type {boolean}
         * @protected
         */
        noCache: false,

        /**
         * Not to render a view automatically when a view tree is built (ready).
         * Afterwards it can be rendered manually.
         *
         * @type {boolean}
         * @protected
         */
        notToRender: false,

        /**
         * @type {string|null}
         * @private
         */
        _template: null,

        /**
         * Layout itself.
         *
         * @type {Object|null}
         * @protected
         * @internal
         */
        _layout: null,

        /**
         * Layout data.
         *
         * @type {Object|null}
         * @protected
         */
        layoutData: null,

        /**
         * Whether the view is ready for rendering (all necessary data is loaded).
         *
         * @type {boolean}
         * @public
         */
        isReady: false,

        /**
         * Definitions for nested views that should be automatically created.
         * Format: viewKey => view defs.
         *
         * Example: ```
         * {
         *   body: {
         *     view: 'view/path/body',
         *     selector: '> .body',
         *   }
         * }
         * ```
         *
         * @type {Object.<string,Bull.View~NestedViewItem>|null}
         * @protected
         */
        views: null,

        /**
         * A list of options to be automatically passed to child views.
         *
         * @type {string[]|null}
         * @protected
         */
        optionsToPass: null,

        /**
         * Nested views.
         *
         * @type {Object.<string, Bull.View>}
         * @protected
         * @internal
         */
        nestedViews: null,

        /**
         * @type {Object}
         * @private
         */
        _nestedViewDefs: null,

        /**
         * @private
         */
        _factory: null,

        /**
         * @private
         * @deprecated
         * @todo Remove.
         */
        factory: null,

        /**
         * @private
         */
        _templator: null,

        /**
         * @private
         */
        _renderer: null,

        /**
         * @private
         */
        _layouter: null,

        /**
         * A helper.
         *
         * @protected
         */
        _helper: null,

        /**
         * @private
         */
        _templateCompiled: null,

        /**
         * @private
         */
        _parentView: null,

        /**
         * @private
         */
        _path: '',

        /**
         * @private
         */
        _wait: false,

        /**
         * @private
         */
        _waitViewList: null,

        /**
         * @private
         */
        _nestedViewsFromLayoutLoaded: false,

        /**
         * @private
         */
        _readyConditionList: null,

        /**
         * @private
         */
        _isRendered: false,

        /**
         * @private
         */
        _isFullyRendered: false,

        /**
         * @private
         */
        _isBeingRendered: false,

        /**
         * @private
         */
        _isRemoved: false,

        /**
         * @private
         */
        _isRenderCanceled: false,

        /**
         * Set a DOM element selector.
         *
         * @param {string} selector A full DOM selector.
         */
        setElement: function (selector) {
            this.undelegateEvents();
            this._setElement(selector);
            this._delegateEvents();
        },

        /**
         * Removes all view's delegated events. Useful if you want to disable
         * or remove a view from the DOM temporarily.
         */
        undelegateEvents: function() {
            if (!this.$el) {
                return;
            }

            this.$el.off('.delegateEvents' + this.cid);
        },

        /**
         * @private
         */
        _delegateEvents: function () {
            let events = _.result(this, 'events');

            if (!events) {
                return;
            }

            this.undelegateEvents();

            for (let key in events) {
                let method = events[key];

                if (!_.isFunction(method)) {
                    /** @todo Revise. */
                    method = this[method];
                }

                if (!method) {
                    continue;
                }

                let match = key.match(delegateEventSplitter);

                this._delegate(match[1], match[2], method.bind(this));
            }
        },

        /**
         * @private
         */
        _delegate: function (eventName, selector, listener) {
            this.$el.on(eventName + '.delegateEvents' + this.cid, selector, listener);
        },

        /**
         * To be run by the view-factory after instantiating. Should not be overridden.
         * Not called from the constructor to be able to use ES6 classes with property initializers,
         * as overridden properties not available in a constructor.
         *
         * @param {{
         *   factory: Bull.Factory,
         *   renderer: Bull.Renderer,
         *   templator: Bull.Templator,
         *   layouter: Bull.Layouter,
         *   helper: Object,
         *   onReady: function(): void,
         * }} data
         * @internal
         */
        _initialize: function (data) {
            /**
             * @type {Bull.Factory}
             * @private
             */
            this._factory = this.factory = data.factory;

            /**
             * @type {Bull.Renderer}
             * @private
             */
            this._renderer = data.renderer;

            /**
             * @type {Bull.Templator}
             * @private
             */
            this._templator = data.templator;

            /**
             * @type {Bull.Layouter}
             * @private
             */
            this._layouter = data.layouter;

            /**
             * @type {(function(): void)|null}
             * @private
             */
            this._onReady = data.onReady || null;

            /**
             * @type {Object|null}
             * @private
             */
            this._helper = data.helper || null;

            if ('noCache' in this.options) {
                this.noCache = this.options.noCache;
            }

            this.events = _.clone(this.events || {});
            this.name = this.options.name || this.name;
            this.notToRender = ('notToRender' in this.options) ? this.options.notToRender : this.notToRender;

            this.nestedViews = {};
            /** @private */
            this._nestedViewDefs = {};

            if (this._waitViewList == null) {
                /** @private */
                this._waitViewList = [];
            }

            /** @private */
            this._waitPromiseCount = 0;

            if (this._readyConditionList == null) {
                /** @private */
                this._readyConditionList = [];
            }

            this.optionsToPass = this.options.optionsToPass || this.optionsToPass || [];

            let merge = function (target, source) {
                for (let prop in source) {
                    if (typeof target === 'object') {
                        if (prop in target) {
                            merge(target[prop], source[prop]);
                        } else {
                            target[prop] = source[prop];
                        }
                    }
                }

                return target;
            };

            if (this.views || this.options.views) {
                this.views = merge(this.options.views || {}, this.views || {});
            }

            this.init();
            this.setup();
            this.setupFinal();

            this.template = this.options.template || this.template;
            /**
             * @todo Revise.
             * @type {string}
             * @private
             */
            this.layout = this.options.layout || this.layout;

            /** @private */
            this._layout = this.options.layoutDefs || this.options._layout || this._layout;
            /**
             * @private
             * @type {Object|null}
             */
            this.layoutData = this.options.layoutData || this.layoutData;
            /**
             * @type {string|null}
             * @private
             */
            this._template = this.templateContent || this.options.templateContent || this._template;

            if (this._template != null && this._templator.compilable) {
                /** @private */
                this._templateCompiled = this._templator.compileTemplate(this._template);
            }

            if (this.options.el) {
                this.setElementInAdvance(this.options.el);
            }

            let _layout = this._getLayout();

            let loadNestedViews = () => {
                this._loadNestedViews(() => {
                    this._nestedViewsFromLayoutLoaded = true;

                    this._tryReady();
                });
            };

            if (this.layout != null || _layout !== null) {
                if (_layout === null) {
                    this._layouter.getLayout(this.layout, (_layout) => {
                        /** @private */
                        this._layout = _layout;

                        loadNestedViews();
                    });

                    return;
                }

                loadNestedViews();

                return;
            }
            else {
                if (this.views != null) {
                    loadNestedViews();

                    return;
                }
            }

            this._nestedViewsFromLayoutLoaded = true;

            this._tryReady();
        },

        /**
         * Compose template data. A key => value result will be passed to
         * a template.
         *
         * @protected
         * @returns {Object.<string, *>|{}}
         */
        data: function () {
            return {};
        },

        /**
         * Initialize the view. Is invoked before #setup.
         *
         * @protected
         */
        init: function () {},

        /**
         * Set up the view. Is invoked after #init.
         *
         * @protected
         */
        setup: function () {},

        /**
         * Additional setup. Is invoked after #setup.
         * Useful to let developers override setup logic w/o needing to call
         * a parent method in right order.
         *
         * @protected
         */
        setupFinal: function () {},

        /**
         * Set a view container element if it doesn't exist yet. It will call setElement after render.
         *
         * @param {string} el A full DOM selector.
         * @protected
         */
        setElementInAdvance: function (el) {
            if (this._setElementInAdvancedInProcess) {
                return;
            }

            this._setElementInAdvancedInProcess = true;

            this.on('after:render-internal', () => {
                this.setElement(el);

                this._setElementInAdvancedInProcess = false;
            });
        },

        /**
         * Get a full DOM element selector.
         *
         * @public
         * @return {string|null}
         */
        getSelector: function () {
            return this.options.el || null;
        },

        /**
         * Set a full DOM element selector.
         *
         * @public
         * @param {string} selector A selector.
         */
        setSelector: function (selector) {
            this.options.el = selector;
        },

        /**
         * Checks whether the view has been already rendered
         *
         * @public
         * @return {boolean}
         */
        isRendered: function () {
            return this._isRendered;
        },

        /**
         * Checks whether the view has been fully rendered (afterRender has been executed).
         *
         * @public
         * @return {boolean}
         */
        isFullyRendered: function () {
            return this._isFullyRendered;
        },

        /**
         * Whether the view is being rendered at the moment.
         *
         * @public
         * @return {boolean}
         */
        isBeingRendered: function () {
            return this._isBeingRendered;
        },

        /**
         * Whether the view is removed.
         *
         * @public
         * @return {boolean}
         */
        isRemoved: function () {
            return this._isRemoved;
        },

        /**
         * Get HTML of view but don't render it.
         *
         * @public
         * @param {Bull.View~getHtmlCallback} callback A callback with an HTML.
         */
        getHtml: function (callback) {
            this._getHtml(callback);
        },

        /**
         * Cancel rendering.
         */
        cancelRender: function () {
            if (!this.isBeingRendered()) {
                return;
            }

            this._isRenderCanceled = true;
        },

        /**
         * Un-cancel rendering.
         */
        uncancelRender: function () {
            this._isRenderCanceled = false;
        },

        /**
         * Render the view.
         *
         * @param {Function} [callback] Deprecated. Use promise.
         * @return {Promise<this>}
         */
        render: function (callback) {
            this._isRendered = false;
            this._isFullyRendered = false;

            return new Promise(resolve => {
                this._getHtml(html => {
                    if (this._isRenderCanceled) {
                        this._isRenderCanceled = false;
                        this._isBeingRendered = false;

                        return;
                    }

                    if (this.$el.length) {
                        this.$el.html(html);
                    }
                    else {
                        if (this.options.el) {
                           this.setElement(this.options.el);
                        }

                        this.$el.html(html);
                    }

                    this._afterRender();

                    if (typeof callback === 'function') {
                        callback();
                    }

                    resolve(this);
                });
            });
        },

        /**
         * Re-render the view.
         *
         * @param {boolean} [force=false] To render if was not rendered.
         * @return {Promise<this>}
         */
        reRender: function (force) {
            if (this.isRendered()) {
                return this.render();
            }

            if (this.isBeingRendered()) {
                return new Promise((resolve, reject) => {
                    this.once('after:render', () => {
                        this.render()
                            .then(() => resolve(this))
                            .catch(reject);
                    });
                });
            }

            if (force) {
                return this.render();
            }

            // Don't reject, preventing an exception on a non-caught promise.
            return new Promise(() => {});
        },

        /**
         * @private
         */
        _afterRender: function () {
            this._isBeingRendered = false;
            this._isRendered = true;

            this.trigger('after:render-internal', this);

            for (let key in this.nestedViews) {
                let nestedView = this.nestedViews[key];

                if (!nestedView.notToRender) {
                    nestedView._afterRender();
                }
            }

            this.afterRender();

            this.trigger('after:render', this);

            this._isFullyRendered = true;
        },

        /**
         * Executed after render.
         *
         * @protected
         */
        afterRender: function () {},

        /**
         * Proceed when rendered.
         *
         * @return {Promise<void>}
         */
        whenRendered: function () {
            if (this.isRendered()) {
                return Promise.resolve();
            }

            return new Promise(resolve => {
                this.once('after:render', () => resolve())
            });
        },

        /**
         * @private
         */
        _tryReady: function () {
            if (this.isReady) {
                return;
            }

            if (this._wait) {
                return;
            }

            if (!this._nestedViewsFromLayoutLoaded) {
                return;
            }

            for (let i = 0; i < this._waitViewList.length; i++) {
                if (!this.hasView(this._waitViewList[i])) {
                    return;
                }
            }

            if (this._waitPromiseCount) {
                return;
            }

            for (let i = 0; i < this._readyConditionList.length; i++) {
                if (typeof this._readyConditionList[i] === 'function') {
                    if (!this._readyConditionList[i]()) {
                        return;
                    }
                }
                else {
                    if (!this._readyConditionList) {
                        return;
                    }
                }
            }

            this._makeReady();
        },

        /**
         * @private
         */
        _makeReady: function () {
            this.isReady = true;
            this.trigger('ready');

            if (typeof this._onReady === 'function') {
                this._onReady(this);
            }
        },

        /**
         * @private
         */
        _addDefinedNestedViewDefs: function (list) {
            for (let name in this.views) {
                let o = _.clone(this.views[name]);

                o.name = name;

                list.push(o);

                this._nestedViewDefs[name] = o;
            }

            return list;
        },

        /**
         * @private
         */
        _getNestedViewsFromLayout: function () {
            let nestedViewDefs = this._layouter
                .findNestedViews(this._getLayoutName(), this._getLayout() || null, this.noCache);

            if (Object.prototype.toString.call(nestedViewDefs) !== '[object Array]') {
                throw new Error("Bad layout. It should be an Array.");
            }

            let nestedViewDefsFiltered = [];

            for (let i in nestedViewDefs) {
                let key = nestedViewDefs[i].name;

                this._nestedViewDefs[key] = nestedViewDefs[i];

                if ('view' in nestedViewDefs[i] && nestedViewDefs[i].view === true) {
                    if (!('layout' in nestedViewDefs[i] || 'template' in nestedViewDefs[i])) {
                        continue;
                    }
                }

                nestedViewDefsFiltered.push(nestedViewDefs[i]);
            }

            return nestedViewDefsFiltered;
        },

        /**
         * @private
         */
        _loadNestedViews: function (callback) {
            let nestedViewDefs = [];

            if (this._layout != null) {
                nestedViewDefs = this._getNestedViewsFromLayout();
            }

            this._addDefinedNestedViewDefs(nestedViewDefs);

            let count = nestedViewDefs.length;
            let loaded = 0;

            let tryReady = function () {
                if (loaded === count) {
                    callback();

                    return true;
                }
            };

            tryReady();

            nestedViewDefs.forEach((def, i) => {
                let key = nestedViewDefs[i].name;
                let viewName = this._factory.defaultViewName;

                if ('view' in nestedViewDefs[i]) {
                    viewName = nestedViewDefs[i].view;
                }

                if (viewName === false) {
                    loaded++;

                    tryReady();

                    return;
                }

                let options = {};

                if ('layout' in nestedViewDefs[i]) {
                    options.layout = nestedViewDefs[i].layout;
                }

                if ('template' in nestedViewDefs[i]) {
                    options.template = nestedViewDefs[i].template;
                }

                if ('el' in nestedViewDefs[i]) {
                    options.el = nestedViewDefs[i].el;
                }

                if ('options' in nestedViewDefs[i]) {
                    options = _.extend(options, nestedViewDefs[i].options);
                }

                if (this.model) {
                    options.model = this.model;
                }

                if (this.collection) {
                    options.collection = this.collection;
                }

                for (let k in this.optionsToPass) {
                    let name = this.optionsToPass[k];

                    options[name] = this.options[name];
                }

                this._factory.create(viewName, options, (view) => {
                    if ('notToRender' in nestedViewDefs[i]) {
                        view.notToRender = nestedViewDefs[i].notToRender;
                    }

                    this.setView(key, view);

                    loaded++;

                    tryReady();
                });
            });
        },

        /**
         * @private
         */
        _getData: function () {
            if (this.options.data) {
                if (typeof this.options.data === 'function') {
                    return this.options.data();
                }

                return this.options.data;
            }

            if (typeof this.data === 'function') {
                return this.data();
            }

            return this.data;
        },

        /**
         * @private
         */
        _getNestedViewsAsArray: function () {
            let nestedViewsArray = [];

            let i = 0;

            for (let key in this.nestedViews) {
                nestedViewsArray.push({
                    key: key,
                    view: this.nestedViews[key]
                });

                i++;
            }

            return nestedViewsArray;

        },

        /**
         * @private
         */
        _getNestedViewsHtmlList: function (callback) {
            let data = {};
            let nestedViewsArray = this._getNestedViewsAsArray();

            let loaded = 0;
            let count = nestedViewsArray.length;

            let tryReady = () => {
                if (loaded === count) {
                    callback(data);

                    return true;
                }
            };

            tryReady();

            nestedViewsArray.forEach((d, i) => {
                let key = nestedViewsArray[i].key;
                let view = nestedViewsArray[i].view;

                if (!view.notToRender) {
                    view.getHtml((html) => {
                        data[key] = html;

                        loaded++;
                        tryReady();
                    });

                    return;
                }

                loaded++;
                tryReady();
            });
        },

        /**
         * Provides the ability to modify template data right before render.
         *
         * @param {Object} data Data.
         */
        handleDataBeforeRender: function (data) {},

        /**
         * @private
         */
        _getHtml: function (callback) {
            this._isBeingRendered = true;
            this.trigger('render', this);

            this._getNestedViewsHtmlList(nestedViewsHtmlList => {
                let data = _.extend(this._getData() || {}, nestedViewsHtmlList);

                if (this.collection || null) {
                    data.collection = this.collection;
                }

                if (this.model || null) {
                    data.model = this.model;
                }

                data.viewObject = this;

                this.handleDataBeforeRender(data);

                this._getTemplate(template => {
                    let html = this._renderer.render(template, data);

                    callback(html);
                });
            });
        },

        /**
         * @private
         */
        _getTemplateName: function () {
            return this.template || null;
        },

        /**
         * @private
         */
        _getLayoutName: function () {
            return this.layout || this.name || null;
        },

        /**
         * @private
         */
        _getLayoutData: function () {
            return this.layoutData;
        },

        /**
         * @private
         */
        _getLayout: function () {
            if (typeof this._layout === 'function') {
                return this._layout();
            }

            return this._layout;
        },

        /**
         * @private
         */
        _getTemplate: function (callback) {
            if (this._templator.compilable && this._templateCompiled !== null) {
                callback(this._templateCompiled);

                return;
            }

            let _template = this._template || null;

            if (_template !== null) {
                callback(_template);

                return;
            }

            let templateName = this._getTemplateName();

            let noCache = false;
            let layoutOptions = {};

            if (!templateName) {
                noCache = this.noCache;

                let layoutName = this._getLayoutName();

                if (!layoutName) {
                    noCache = true;
                }
                else {
                    if (layoutName) {
                        templateName = 'built-' + layoutName;
                    }
                    else {
                        templateName = null;
                    }
                }

                layoutOptions = {
                    name: layoutName,
                    data: this._getLayoutData(),
                    layout: this._getLayout(),
                };
            }

            this._templator.getTemplate(templateName, layoutOptions, noCache, callback);
        },

        /**
         * @private
         */
        _updatePath: function (parentPath, viewKey) {
            this._path = parentPath + '/' + viewKey;

            for (let key in this.nestedViews) {
                this.nestedViews[key]._updatePath(this._path, key);
            }
        },

        /**
         * @private
         */
        _getSelectorForNestedView: function (key) {
            let el = false;

            if (key in this._nestedViewDefs) {
                if ('id' in this._nestedViewDefs[key]) {
                    el = '#' + this._nestedViewDefs[key].id;
                }
                else {
                    if ('el' in this._nestedViewDefs[key]) {
                        el = this._nestedViewDefs[key].el;
                    }
                    else if ('selector' in this._nestedViewDefs[key]) {
                        let currentEl = this.getSelector();

                        if (currentEl) {
                            el = currentEl + ' ' + this._nestedViewDefs[key].selector;
                        }
                    }
                    else {
                        let currentEl = this.getSelector();

                        if (currentEl) {
                            el = currentEl + ' [data-view="'+key+'"]';
                        }
                    }
                }
            }

            return el;
        },

        /**
         * Whether the view has a nested view.
         *
         * @param {string} key A view key.
         * @return {boolean}
         */
        hasView: function (key) {
            return key in this.nestedViews;
        },

        /**
         * Get a nested view.
         *
         * @param {string} key A view key.
         * @return {Bull.View}
         */
        getView: function (key) {
            if (key in this.nestedViews) {
                return this.nestedViews[key];
            }
        },

        /**
         * Assign a view instance as nested.
         *
         * @param {string} key A view key.
         * @param {Bull.View} view A view.
         * @param {string|null} [selector] A relative selector.
         * @return {Promise<Bull.View>}
         */
        assignView: function (key, view, selector) {
            this.clearView(key);

            this._viewPromiseHash = this._viewPromiseHash || {};
            let promise = null;

            promise = this._viewPromiseHash[key] = new Promise(resolve => {
                if (!this.isReady) {
                    this.waitForView(key);
                }

                if (selector || !view.getSelector()) {
                    selector = selector || `[data-view="${key}"]`;

                    view.setSelector(this.getSelector() + ' ' + selector);
                }

                view._initialize({
                    factory: this._factory,
                    layouter: this._layouter,
                    templator: this._templator,
                    renderer: this._renderer,
                    helper: this._helper,
                    onReady: () => this._assignViewCallback(key, view, resolve, promise),
                });
            });

            return promise;
        },

        /**
         * Create a nested view. The important method.
         *
         * @param {string} key A view key.
         * @param {string} viewName A view name/path.
         * @param {Bull.View~Options} options View options. Custom options can be passed as well.
         * @param {Function} [callback] Deprecated. Use a promise. Invoked once a nested view is ready (loaded).
         * @param {boolean} [wait=true] Set false if no need a parent view to wait till nested view loaded.
         * @return {Promise<Bull.View>}
         */
        createView: function (key, viewName, options, callback, wait) {
            this.clearView(key);

            this._viewPromiseHash = this._viewPromiseHash || {};

            let promise = null;

            promise = this._viewPromiseHash[key] = new Promise(resolve => {
                wait = (typeof wait === 'undefined') ? true : wait;

                if (wait) {
                    this.waitForView(key);
                }

                options = options || {};

                if (!options.el && options.selector) {
                    options.el = this.getSelector() + ' ' + options.selector;
                }

                if (!options.el) {
                    options.el = this.getSelector() + ` [data-view="${key}"]`;
                }

                this._factory.create(viewName, options, view => {
                    this._assignViewCallback(
                        key,
                        view,
                        resolve,
                        promise,
                        callback,
                        options.setViewBeforeCallback
                    );
                });
            });

            return promise;
        },

        /**
         * @param {string} key
         * @param {Bull.View} view
         * @param {function} resolve
         * @param {Promise} promise
         * @param {function} [callback]
         * @param {boolean} [setViewBeforeCallback]
         * @private
         */
        _assignViewCallback: function (
            key,
            view,
            resolve,
            promise,
            callback,
            setViewBeforeCallback
        ) {
            let previousView = this.getView(key);

            if (previousView) {
                previousView.cancelRender();
            }

            delete this._viewPromiseHash[key];

            if (promise && promise._isToCancel) {
                if (!view.isRemoved()) {
                    view.remove();
                }

                return;
            }

            let isSet = false;

            if (this._isRendered || setViewBeforeCallback) {
                this.setView(key, view);

                isSet = true;
            }

            if (typeof callback === 'function') {
                callback.call(this, view);
            }

            resolve(view);

            if (!this._isRendered && !setViewBeforeCallback && !isSet) {
                this.setView(key, view);
            }
        },

        /**
         * Set a nested view.
         *
         * @param {string} key A view key.
         * @param {Bull.View} view A view name/path.
         * @param {string} [el] A full DOM selector for a view container.
         */
        setView: function (key, view, el) {
            el = el || this._getSelectorForNestedView(key) || view.options.el || false;

            if (el) {
                if (this.isRendered()) {
                    view.setElement(el);
                } else {
                    view.setElementInAdvance(el);
                }
            }

            if (key in this.nestedViews) {
                this.clearView(key);
            }

            this.nestedViews[key] = view;

            view._parentView = this;
            view._updatePath(this._path, key);

            this._tryReady();
        },

        /**
         * Clear a nested view. Initiates removal of the nested view.
         *
         * @param {string} key A view key.
         */
        clearView: function (key) {
            if (key in this.nestedViews) {
                this.nestedViews[key].remove();

                delete this.nestedViews[key];
            }

            this._viewPromiseHash = this._viewPromiseHash || {};

            let previousPromise = this._viewPromiseHash[key];

            if (previousPromise) {
                previousPromise._isToCancel = true;
            }
        },

        /**
         * Removes a nested view for cases when it's supposed that this view can be re-used in future.
         *
         * @param {string} key A view key.
         */
        unchainView: function (key) {
            if (key in this.nestedViews) {
                this.nestedViews[key]._parentView = null;
                this.nestedViews[key].undelegateEvents();

                delete this.nestedViews[key];
            }
        },

        /**
         * Get a parent view.
         *
         * @return {Bull.View}
         */
        getParentView: function () {
            return this._parentView;
        },

        /**
         * Has a parent view.
         *
         * @return {boolean}
         */
        hasParentView: function () {
            return !!this._parentView;
        },

        /**
         * Add a condition for the view getting ready.
         *
         * @param {(Function|boolean)} condition A condition.
         */
        addReadyCondition: function (condition) {
            this._readyConditionList.push(condition);
        },

        /**
         * Wait for a nested view.
         *
         * @protected
         * @param {string} key A view key.
         */
        waitForView: function (key) {
            this._waitViewList.push(key);
        },

        /**
         * Makes the view to wait for a promise (if a Promise is passed as a parameter).
         * Adds a wait condition if true is passed. Removes the wait condition if false.
         *
         * @protected
         * @param {Promise|boolean} wait A wait-promise or true/false.
         */
        wait: function (wait) {
            if (typeof wait === 'object' && (wait instanceof Promise || typeof wait.then === 'function')) {
                this._waitPromiseCount++;

                wait.then(() => {
                    this._waitPromiseCount--;
                    this._tryReady();
                });

                return;
            }

            if (typeof wait === 'function') {
                this._waitPromiseCount++;

                let promise = new Promise(resolve => {
                    resolve(wait.call(this));
                });

                promise.then(() => {
                    this._waitPromiseCount--;
                    this._tryReady();
                });

                return promise;
            }

            if (wait) {
                this._wait = true;

                return;
            }

            this._wait = false;
            this._tryReady();
        },

        /**
         * Remove the view and all nested tree. Removes an element from DOM. Triggers the 'remove' event.
         *
         * @public
         * @param {boolean} [dontEmpty] Skips emptying an element container.
         */
        remove: function (dontEmpty) {
            this.cancelRender();

            for (let key in this.nestedViews) {
                this.clearView(key);
            }

            this.trigger('remove');
            this.onRemove();
            this.off();

            if (!dontEmpty) {
                this.$el.empty();
            }

            this.stopListening();
            this.undelegateEvents();

            if (this.model) {
                this.model.off(null, null, this);
            }

            if (this.collection) {
                this.collection.off(null, null, this);
            }

            this._isRendered = false;
            this._isFullyRendered = false;
            this._isBeingRendered = false;
            this._isRemoved = true;

            return this;
        },

        /**
         * Called on view removal.
         *
         * @protected
         */
        onRemove: function () {},

        /**
         * @private
         */
        _setElement: function (el) {
            if (typeof el === 'string') {
                let parentView = this.getParentView();

                if (
                    parentView &&
                    parentView.isRendered() &&
                    parentView.$el &&
                    parentView.$el.length &&
                    parentView.getSelector() &&
                    el.indexOf(parentView.getSelector()) === 0
                ) {
                    let subEl = el.substr(parentView.getSelector().length, el.length - 1);

                    this.$el = $(subEl, parentView.$el).eq(0);
                    this.el = this.$el[0];

                    return;
                }
            }

            this.$el = $(el).eq(0);
            this.el = this.$el[0];
        },

        /**
         * Propagate an event to nested views.
         *
         * @public
         * @param {...*} arguments
         */
        propagateEvent: function () {
            this.trigger.apply(this, arguments);

            for (let key in this.nestedViews) {
                let view = this.nestedViews[key];

                view.propagateEvent.apply(view, arguments);
            }
        },
    });
}).call(this, Bull, Backbone, _);

(function (Bull, _) {

    /**
     * @class Bull.Loader
     * @param options
     */
    Bull.Loader = function (options) {
        options = options || {};

        this._paths = _.extend(this._paths, options.paths || {});
        this._exts = _.extend(this._exts, options.exts || {});
        this._normalize = _.extend(this._normalize, options.normalize || {});
        this._isJson = _.extend(this._isJson, options.isJson || {});

        this._externalLoaders = _.extend(this._externalLoaders, options.loaders || {});

        this._externalPathFunction = options.path || null;
    };

    _.extend(Bull.Loader.prototype, /** @lends Bull.Loader.prototype */{

        _exts: {
            layout: 'json',
            template: 'tpl',
            layoutTemplate: 'tpl',
        },

        _paths: {
            layout: 'layouts',
            template: 'templates',
            layoutTemplate: 'templates/layouts',
        },

        _isJson: {
            layout: true,
        },

        _externalLoaders: {
            layout: null,
            template: null,
            layoutTemplate: null,
        },

        _externalPathFunction: null,

        _normalize: {
            layouts: function (name) {
                return name;
            },
            templates: function (name) {
                return name;
            },
            layoutTemplates: function (name) {
                return name;
            },
        },

        getFilePath: function (type, name) {
            if (!(type in this._paths) || !(type in this._exts)) {
                throw new TypeError("Unknown resource type \"" + type + "\" requested in Bull.Loader.");
            }

            let namePart = name;

            if (type in this._normalize) {
                namePart = this._normalize[type](name);
            }

            let pathPart = this._paths[type];

            if (pathPart.substr(-1) === '/') {
                pathPart = pathPart.substr(0, pathPart.length - 1);
            }

            return pathPart + '/' + namePart + '.' + this._exts[type];
        },

        _callExternalLoader: function (type, name, callback) {
            if (type in this._externalLoaders && this._externalLoaders[type] !== null) {
                if (typeof this._externalLoaders[type] === 'function') {
                    this._externalLoaders[type](name, callback);

                    return true;
                }

                throw new Error("Loader for \"" + type + "\" in not a Function.");
            }

            return null;
        },

        load: function (type, name, callback) {
            let customCalled = this._callExternalLoader(type, name, callback);

            if (customCalled) {
                return;
            }

            let response, filePath;

            if (this._externalPathFunction != null) {
                filePath = this._externalPathFunction.call(this, type, name);
            } else {
                filePath = this.getFilePath(type, name);
            }

            filePath += '?_=' + new Date().getTime();

            let xhr = new XMLHttpRequest();

            xhr.open('GET', filePath, true);
            xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest');

            xhr.onreadystatechange = () => {
                if (xhr.readyState === 4) {
                    response = xhr.responseText;

                    if (type in this._isJson) {
                        if (this._isJson[type]) {
                            let obj;

                            if (xhr.status == 404 || xhr.status == 403) {
                                throw new Error("Could not load " + type + " \"" + name + "\".");
                            }

                            try {
                                obj = JSON.parse(String(response));
                            }
                            catch (e) {
                                throw new SyntaxError(
                                    "Error while parsing " + type + " \"" + name + "\": (" + e.message + ").");
                            }

                            callback(obj);

                            return;
                        }
                    }

                    callback(response);
                }
            };

            xhr.send(null);
        },
    });

}).call(this, Bull, _);

(function (Bull, _, Handlebars) {

    /**
     * @class Bull.Templator
     * @param {{
     *   loader: Bull.Loader,
     *   layouter: Bull.Layouter,
     * }|null} data
     */
    Bull.Templator = function (data) {
        data = data || {};

        this._templates = {};
        this._layoutTemplates = {};

        /**
         * @type {Bull.Loader|null}
         * @private
         */
        this._loader = data.loader || null;
        /**
         * @type {Bull.Layouter|null}
         * @private
         */
        this._layouter = data.layouter || null;

        if ('compilable' in data) {
            this.compilable = data.compilable;
        }
    };

    _.extend(Bull.Templator.prototype, /** @lends Bull.Templator.prototype */{

        compilable: true,

        _templates: null,
        _layoutTemplates: null,

        addTemplate: function (name, template) {
            this._templates[name] = template;
        },

        getTemplate: function (name, layoutOptions, noCache, callback) {
            layoutOptions = layoutOptions || {};

            let template = null;

            if (!layoutOptions.name && !layoutOptions.layout && !name) {
                throw new Error("Can not get template. Not enough data passed.");
            }

            if (!noCache && name) {
                template = this._getCachedTemplate(name);

                if (template) {
                    callback(template);

                    return;
                }
            }

            let layout = layoutOptions.layout || null;

            let then = (template) => {
                if (this.compilable) {
                    template = this.compileTemplate(template);
                }

                this._templates[name] = template;

                callback(template);
            };

            let proceedWithLayout = (layout) => {
                if (layout == null) {
                    throw new Error("Could not get layout '" + layoutOptions.name + "'.");
                }

                this._buildTemplate(layout, layoutOptions.data, then);
            };

            if (!template) {
                if (!layoutOptions.name && !layoutOptions.layout) {
                    this._loader.load('template', name, then);
                }
                else {
                    if (!layout) {
                        this._layouter.getLayout(layoutOptions.name, proceedWithLayout);
                    } else {
                        proceedWithLayout(layout);
                    }
                }
            }
        },

        compileTemplate: function (template) {
            if (typeof Handlebars !== 'undefined') {
                return Handlebars.compile(template);
            }

            return template;
        },

        _getCachedTemplate: function (templateName) {
            if (templateName in this._templates) {
                return this._templates[templateName];
            }

            return false;
        },


        _getCachedLayoutTemplate: function (layoutType) {
            if (layoutType in this._layoutTemplates) {
                return this._layoutTemplates[layoutType];
            }

            return false;
        },

        _cacheLayoutTemplate: function (layoutType, layoutTemplate) {
            this._layoutTemplates[layoutType] = layoutTemplate;
        },

        _buildTemplate: function (layoutDefs, data, callback) {
            let layoutType = layoutDefs.type || 'default';

            var proceed = (layoutTemplate) => {
                let injection = _.extend(layoutDefs, data || {});
                let template = _.template(layoutTemplate, injection);

                if (typeof template === 'function') {
                    template = template(injection);
                }

                callback(template);
            };

            let layoutTemplate = this._getCachedLayoutTemplate(layoutType);

            if (!layoutTemplate) {
                this._loader.load('layoutTemplate', layoutType, (layoutTemplate) => {
                    this._cacheLayoutTemplate(layoutType, layoutTemplate);

                    proceed(layoutTemplate);
                });

                return;
            }

            proceed(layoutTemplate);
        },
    });

}).call(this, Bull, _, Handlebars);

(function (Bull, _) {

    /**
     * @class Bull.Layouter
     * @param {{
     *   loader: Bull.Loader,
     * }|null} data
     */
    Bull.Layouter = function (data) {
        data = data || {};

        /**
         * @type {Bull.Loader|null}
         * @private
         */
        this._loader = data.loader || null;

        this._layouts = {};
        this._cachedNestedViews = {};
    };

    _.extend(Bull.Layouter.prototype, /** @lends Bull.Layouter.prototype */{

        _layouts: null,
        _cachedNestedViews: null,

        addLayout: function (layoutName, layout) {
            this._layouts[layoutName] = layout;
        },

        getLayout: function (layoutName, callback) {
            if (layoutName in this._layouts) {
                callback(this._layouts[layoutName]);

                return;
            }

            this._loader.load('layout', layoutName, layout => {
                this.addLayout(layoutName, layout);

                callback(layout);
            });
        },

        _getCachedNestedViews: function (layoutName) {
            if (layoutName in this._cachedNestedViews) {
                return this._cachedNestedViews[layoutName];
            }

            return false;
        },

        _cacheNestedViews: function (layoutName, nestedViews) {
            if (!(layoutName in this._cachedNestedViews)) {
                this._cachedNestedViews[layoutName] = nestedViews;
            }
        },

        findNestedViews: function (layoutName, layoutDefs, noCache) {
            if (!layoutName && !layoutDefs) {
                throw new Error("Can not find nested views. No layout data and name.");
            }

            if (layoutName && !noCache) {
                let cached = this._getCachedNestedViews(layoutName);

                if (cached) {
                    return cached;
                }
            }

            if (typeof layoutDefs === 'undefined') {
                if (layoutName in this._layouts) {
                    layoutDefs = this._layouts[layoutName];
                }

                if (!('layout' in layoutDefs)) {
                    throw new Error("Layout \"" + layoutName + "\"" + " is bad.");
                }
            }

            let layout = layoutDefs.layout;
            let viewPathList = [];

            let uniqName = (name, count) => {
                let modName = name;

                if (typeof count !== 'undefined') {
                    modName = modName + '_' + count;
                } else {
                    count = 0;
                }

                for (let i in viewPathList) {
                    if (viewPathList[i].name === modName) {
                        return uniqName(name, count + 1);
                    }
                }

                return modName;
            };

            let getDefsForNestedView = (defsInLayout) => {
                let defs = {};

                let params = ['view', 'layout', 'notToRender', 'options', 'template', 'id', 'selector', 'el'];

                for (let i in params) {
                    let param = params[i];

                    if (param in defsInLayout) {
                        defs[param] = defsInLayout[param];
                    }
                }

                if ('name' in defsInLayout) {
                    defs.name = uniqName(defsInLayout.name);
                }

                return defs;
            };

            let seekForViews = (tree) => {
                for (let key in tree) {
                    if (tree[key] !== null && typeof tree[key] === 'object') {
                        if ('view' in tree[key] || 'layout' in tree[key] || 'template' in tree[key]) {
                            let def = getDefsForNestedView(tree[key]);

                            if ('name' in def) {
                                viewPathList.push(def);
                            }
                        }
                        else {
                            seekForViews(tree[key]);
                        }
                    }
                }
            };

            seekForViews(layout);

            if (layoutName && !noCache) {
                this._cacheNestedViews(layoutName, viewPathList);
            }

            return viewPathList;
        }
    });

}).call(this, Bull, _);

(function (Bull, _) {

    /**
     * @class Bull.Renderer
     */
    Bull.Renderer = function (options) {
        options = options || {};

        this._render = options.method || this._render;
    };

    _.extend(Bull.Renderer.prototype, {

        _render: function (template, data) {
            return template(data, {allowProtoPropertiesByDefault: true});
        },

        render: function (template, data) {
            return this._render.call(this, template, data);
        },
    });

}).call(this, Bull, _);
