// lib/cli.js - Command-line Interface
//
// Copyright (c) 2009-2015, DJ-NotYet <dj.notyet@gmail.com>
// Licensed under the MIT License

/* Module references */
var FS = require('fs'),
    Path = require('path'),
    Minimist = require('minimist'),
    UglifyJS = require('uglify-js'),
    RCompile = require('./rcompile')
;

/* Local constants */

/* Local variables */

/* Function definitions */

// Print program usage
function usage() {

    /* jshint maxlen: 100 */
    var helps = [
            'Usage: rcompile [OPTIONS] FILE ...',
            '                                                                                ',
            'Options:',
            '  -b    --base          Base path to the root (default to current folder)',
            '  -l    --library       Path to the library modules (default "lib")',
            '  -c    --compress      Compress the result code (default off)',
            '  -o    --output        Output file to hold the compiled code (default STDOUT)',
            '  -h    --help          Print this message',
            ''
        ]
    ;
    /* jshint maxlen: 80 */

    console.log( helps.join('\n') );
    process.exit( 1 );

}

// Make directory -p
function mkdirp( dir ) {

    var parent = Path.dirname( dir );

    if ( ! FS.existsSync( parent )) {
        mkdirp( parent );
    }

    if ( ! FS.existsSync( dir )) {
        FS.mkdirSync( dir );
    }

}

// Execute the fuze procedure
function run() {

    var argx = Minimist( process.argv.slice( 2 ), {
            alias: {
                b: 'base',
                l: 'library',
                c: 'compress',
                o: 'output',
                h: 'help'
            },
            'default': {
                base: process.cwd(),
                library: '',
                compress: false,
                output: ''
            },
            'boolean': [
                'compress'
            ]
        }),
        argList = argx._
    ;

    if ( argx.help ) {
        return usage();
    }
    if ( argList.length === 0 ) {
        return usage();
    }

    var codes = [],
        i = -1
    ;

    while ( ++i < argList.length ) {
        codes.push(
            (new RCompile({
                base: argx.base,
                library: argx.library,
            }))
                .compile( argList[i] )
                .getResultCode()
        );
    }

    var code = codes.join('\n\n');

    if ( argx.compress ) {
        code = UglifyJS.minify(
                code,
                {
                    fromString: true
                }
            ).code
        ;
    }

    if ( argx.output ) {
        var dirname = Path.dirname( argx.output );

        if ( ! FS.existsSync( dirname )) {
            mkdirp( dirname );
        }

        FS.writeFileSync( argx.output, code );

    } else {
        console.log( code );
    }

}

/* Module exports */

/* Main procedure */

run();
