// lib/rcompile.js
//
// RCompile module
//

/* Module references */
var FS = require('fs'),
    Path = require('path')
;

/* Local constants */
var PATH_SEP = '/',
    MODULE_INDEX = 'index.js',
    EXTENSION_JS = '.js',
    EXTENSION_JSON = '.json',
    REQUIRE_SOURCE = Path.resolve( __dirname + '/../src/require.js')
;

/* Local variables */

/* Function definitions */

// RCompile module
function RCompile( options ) {

    this._options = {
        base: '',
        compress: true,
        library: [],
        prefix: ''
    };
    this._entryModule = '';
    this._baseDir = '';
    this._cachedIds = [];
    this._moduleIds = [];
    this._moduleAliases = {};
    this._resultCode = '';
    this._pathStack = [ '' ];
    this._requireRE = /(?:^|[^.$])\brequire\s*\(\s*(["'])([^"'\s\)]+)\1\s*\)/g;

    this.setOptions( options );

}

// Set options of the RCompile instance
function setOptions( options ) {

    options = options || {};

    this._options.base = (
        options.hasOwnProperty('base') ?
            options.base :
            ''
    );
    this._options.library = (
        options.library ? (
            options.library instanceof Array ?
                options.library :
                [ options.library ]
            ) :
            []
    );

}

// moduleId: a full url or absolute path to the module with/without affixed
// codeHandler: a callback function for processing the module code
function fetchModule( moduleId, codeHandler ) {

    var absPath = Path.resolve( this._baseDir, moduleId ),
        code = FS.readFileSync( absPath, 'UTF-8' )
    ;

    this._pathStack.push( Path.dirname( absPath ) + PATH_SEP );

    if ( codeHandler instanceof Function ) {
        codeHandler( moduleId, code );

    } else {
        this.scanModule( moduleId, code );
    }

    this._pathStack.pop();

}

// moduleId: a full url or absolute path to the module with/without affixed
// moduleCode: the fetched module code
function scanModule( moduleId, moduleCode ) {

    var matches = null,
        modulePath = null
    ;

    this._requireRE.lastIndex = 0;

    while (( matches = this._requireRE.exec( moduleCode )) !== null ) {
        modulePath = matches[2];

        if ( modulePath ) {
            this.requireModule( modulePath );
        }
    }

    this._moduleIds.push( moduleId );

}

// modulePath: a relative/absolute path to the module with/without affixed
function requireModule( modulePath ) {

    var currentPath = this._pathStack[ this._pathStack.length - 1 ],
        libraryPath = null,
        moduleId = null
    ;

    libraryPath = this.locateLibrary( modulePath );

    if ( libraryPath ) {
        moduleId = libraryPath;
        moduleId = Path.normalize( moduleId );
        this._moduleAliases[ modulePath ] = moduleId;

    } else {
        moduleId = Path.relative(
            this._baseDir,
            this.affix(
                Path.resolve( currentPath, modulePath ),
                modulePath
            )
        );
    }

    moduleId = Path.normalize( moduleId );

    if ( this._cachedIds.indexOf( moduleId ) !== - 1 ) {
        return;
    }

    this._cachedIds.push( moduleId );

    this.fetchModule( moduleId );

}

// Locate the true path of the library module
function locateLibrary( moduleName ) {

    var options = this._options,
        libraryList = options.library,
        i = libraryList.length,
        path = null,
        extension = null,
        prefix = null
    ;

    while ( i-- ) {
        path = this._baseDir + Path.sep +
            libraryList[i] + Path.sep +
            moduleName
        ;
        extension = Path.extname( path );
        prefix = libraryList[i] + PATH_SEP + moduleName;

        if ( FS.existsSync( path + PATH_SEP + MODULE_INDEX )) {
            return prefix + PATH_SEP + MODULE_INDEX;

        } else if ( FS.existsSync( path + EXTENSION_JS )) {
            return prefix + EXTENSION_JS;

        } else if ( FS.existsSync( path + EXTENSION_JSON )) {
            return prefix + EXTENSION_JSON;

        } else if ( FS.existsSync( path ) &&
            ( extension === EXTENSION_JS ||
             extension === EXTENSION_JSON )
        ) {
            return prefix;
        }

    }

    return false;

}

// Affix module path with extension
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

// Begin compiling the codes
function compile( entryFile ) {

    var options = this._options,
        absPath = Path.resolve( options.base, entryFile ),
        fileDir = Path.dirname( absPath ),
        baseDir = options.base || fileDir
    ;

    this._entryModule = this.affix( entryFile );
    this._baseDir = Path.resolve( baseDir );

    this.fetchModule( this._entryModule );
    this.combine();

    return this;

}

// Combine module codes into one
function combine() {

    var code = FS.readFileSync( REQUIRE_SOURCE, 'UTF-8' ),
        moduleIds = this._moduleIds,
        moduleAliases = this._moduleAliases,
        moduleId = null,
        moduleCode = null,
        i = -1
    ;

    code += '\n\n';

    for ( var name in moduleAliases ) {
        code += 'require.alias(\'' + name + '\',\'' + moduleAliases[ name ] + '\');\n';
    }

    code += '\n\n';

    while ( ++i < moduleIds.length ) {
        moduleId = moduleIds[i];
        moduleCode = FS.readFileSync( this._baseDir + Path.sep + moduleId, 'UTF-8' );
        code += 'require.set(\'' + moduleId + '\',(function(require,exports,module){\n' +
            moduleCode +
            '\n}));\n\n'
        ;
    }

    code += 'require.run(\'' + this._entryModule + '\');\n\n';

    this._resultCode = code;

    return this;

}

// Get list of module id
function getModuleList() {

    return this._moduleIds;

}

// Get result code
function getResultCode() {

    return this._resultCode;

}

/* Module exports */

RCompile.prototype.setOptions = setOptions;
RCompile.prototype.compile = compile;
RCompile.prototype.fetchModule = fetchModule;
RCompile.prototype.scanModule = scanModule;
RCompile.prototype.requireModule = requireModule;
RCompile.prototype.locateLibrary = locateLibrary;
RCompile.prototype.affix = affix;
RCompile.prototype.combine = combine;
RCompile.prototype.getModuleList = getModuleList;
RCompile.prototype.getResultCode = getResultCode;

module.exports = RCompile;

/* Main procedure */
