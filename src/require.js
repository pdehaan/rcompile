// Require Function
//
// Used by RCompile
//

(function () {

    /* Module references */

    /* Local constants */

    /* Local variables */
    var _moduleAliases = {},
        _moduleDefs = {},
        _moduleObjs = {},  // key: full path resolved but not affixed, value: object
        _pathStack = [ '' ]
    ;

    /* Function definitions */

    // modulePath: a relative/absolute path to the module with/without affixed
    function requireModule( modulePath ) {

        var moduleId = _moduleAliases[ modulePath ];

        if ( ! moduleId ) {
            moduleId = affix(
                resolveModule(
                    modulePath,
                    _pathStack[ _pathStack.length - 1 ]
                ),
                modulePath
            );
        }

        return getModule( moduleId );

    }

    function aliasModule( name, moduleId ) {

        _moduleAliases[ name ] = moduleId;

    }

    function setModule( moduleId, moduleDef ) {

        _moduleDefs[ moduleId ] = moduleDef;

    }

    function getModule( moduleId ) {

        var moduleObject = _moduleObjs[ moduleId ];

        if ( ! moduleObject ) {
            moduleObject = initModule( moduleId );
            _moduleObjs[ moduleId ] = moduleObject;
        }

        return moduleObject;

    }

    function runModule( moduleId ) {

        var moduleObject = getModule( moduleId );

        if ( moduleObject instanceof Function ) {
            moduleObject();
        }

    }

    function initModule( moduleId ) {

        _pathStack.push( dirname( moduleId ));

        var moduleDefinition = _moduleDefs[ moduleId ],
            moduleContext = {
                exports: {}
            },
            moduleObject = moduleDefinition.call(
                window,
                requireModule,
                moduleContext.exports,
                moduleContext
            )
        ;

        _pathStack.pop();

        /* Defined by returning module object */
        if ( typeof moduleObject !== 'undefined' ) {
            _moduleObjs[ moduleId ] = moduleObject;

        /* Defined by setting via module.exports / exports */
        } else if ( moduleContext &&
            typeof moduleContext === 'object' &&
            typeof moduleContext.exports !== 'undefined'
        ) {
            _moduleObjs[ moduleId ] = moduleContext.exports;
        }

        return _moduleObjs[ moduleId ];

    }

    function resolveModule( modulePath, parentId ) {

        if ( modulePath[0] === '.' && parentId ) {
            modulePath = parentId + '/' + modulePath;
        }

        var splits = modulePath.split('/'),
            i = -1,
            stack = []
        ;

        while ( ++i < splits.length ) {
            if ( splits[i] === '.' ) {
                continue;

            } else if ( splits[i] === '..' ) {
                stack.pop();

            } else if ( splits[i] || i === splits.length - 1 ) {
                stack.push( splits[i] );
            }
        }

        return stack.join('/');

    }

    function dirname( path ) {

        var index = path.lastIndexOf('/');

        if ( index !== -1 ) {
            return path.substr( 0, index );

        } else {
            return path;
        }

    }

    function affix( modulePath, referredPath ) {

        var dotIndex = modulePath.lastIndexOf('.'),
            extension = modulePath.substr( dotIndex + 1 ),
            referredPath = referredPath || modulePath
        ;

        // Append .js extension if not present
        if ( extension !== 'js' &&
            extension !== 'json'
        ) {
            if ( referredPath[0] === '.' &&
                referredPath[ referredPath.length - 1 ] !== '/'
            ) {
                modulePath += '.js';

            } else {
                if ( modulePath[ modulePath.length - 1 ] !== '/' ) {
                    modulePath += '/';
                }

                modulePath += 'index.js';
            }
        }

        return modulePath;

    }

    /* Module exports */

    // Export require global functions
    requireModule.alias = aliasModule;
    requireModule.get = getModule;
    requireModule.set = setModule;
    requireModule.run = runModule;

    // Export require to the global
    window.require = requireModule;

    /* Main procedure */

})();
