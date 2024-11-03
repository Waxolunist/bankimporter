const del = require("del");
var sourcemaps = require('gulp-sourcemaps');
var gulp = require('gulp');
var babel = require('gulp-babel');
var sass = require('gulp-sass');
var jade = require('gulp-jade');
var gzip = require('gulp-gzip');
var uglify = require('gulp-uglify');
var pump = require('pump');
var runSequence = require('run-sequence');
var newer = require('gulp-newer');
var merge = require('merge-stream');
var sourcemaps = require('gulp-sourcemaps');


function clean() {
    return del(['./dist/']);
}

gulp.task('sass', function() {
    return gulp.src('src/sass/csvstore.sass')
        .pipe(sourcemaps.init())
        .pipe(sass({ outputStyle: env === 'production' ? 'compressed' : '' }).on('error', sass.logError))
        .pipe(sourcemaps.write('.'))
        //.pipe(gzip())
        .pipe(gulp.dest('dist/css'));
});

gulp.task('templates', function() {
    return gulp.src('src/templates/*.jade')
        .pipe(jade({
            locals: {}
        }))
        .pipe(gzip())
        .pipe(gulp.dest('dist/html'))
});

gulp.task('fonts', function() {
    return gulp.src([
            'src/fonts/*.ttf',
            'node_modules/font-awesome/fonts/*.*'
        ])
        .pipe(gzip())
        .pipe(gulp.dest('dist/fonts'));
});

gulp.task('lit-html', function(cb) {
    return pump([
        gulp.src([
            'node_modules/lit-html/*.js',
            'node_modules/lit-html/polyfills/*.js',
            'node_modules/lit-html/directives/*.js',
            'node_modules/lit-html/lib/*.js'
        ], {
            base: 'node_modules'
        }),
        gzip(),
        gulp.dest('dist/js/')
    ], function(err) {
        console.log('Task lit-html finished! ', err || 'No errors.');
    });
});

gulp.task('client-js', function(cb) {
    return pump([
        gulp.src([
            'node_modules/jquery/dist/jquery.js',
            'node_modules/signals/dist/signals.js',
            'node_modules/hasher/dist/js/hasher.js',
            'node_modules/crossroads/dist/crossroads.js',
            'src/js/*.js'
        ]),
        //sourcemaps.init(),
        //uglify(),
        //sourcemaps.write('.'),
        gzip(),
        gulp.dest('dist/js/')
    ], function(err) {
        console.log('Task client-js finished! ', err || 'No errors.');
    });
});

gulp.task('copy', function(cb) {
    return pump([
        gulp.src(['src/lib/scrapers/*.js']),
        gulp.dest('dist/lib/scrapers')
    ]);
});

gulp.task('babel', function() {
    var server = gulp.src(['src/server.js'])
        .pipe(newer('dist'))
        .pipe(sourcemaps.init())
        .pipe(babel({
            presets: ["es2015", "stage-0"]
        }))
        .pipe(sourcemaps.write('dist'))
        .pipe(gulp.dest('dist'));

    var parsers = gulp.src(['src/lib/parsers/*.js'])
        .pipe(newer('dist/lib/parsers'))
        .pipe(sourcemaps.init())
        .pipe(babel({
            presets: ["es2015", "stage-0"]
        }))
        .pipe(sourcemaps.write('dist/lib/parsers'))
        .pipe(gulp.dest('dist/lib/parsers'));
    var scrapers = gulp.src(['src/lib/scrapers/*.js'])
        .pipe(newer('dist/lib/scrapers'))
        .pipe(sourcemaps.init())
        .pipe(babel({
            presets: ["es2015", "stage-0"]
        }))
        .pipe(sourcemaps.write('dist/lib/scrapers'))
        .pipe(gulp.dest('dist/lib/scrapers'));
    return merge(server, parsers, scrapers);
});

gulp.task('watch', function(cb) {
    gulp.watch(['src/sass/csvstore.sass'], gulp.series('sass'));
    gulp.watch(['src/templates/*.jade'], gulp.series('templates'));
    gulp.watch(['src/js/*.js'], gulp.series('client-js'));
    gulp.watch(['src/server.js', 'src/lib/parsers/*'], gulp.series('babel'));
    gulp.watch(['src/lib/scrapers/*'], gulp.series('copy'));
});

gulp.task('set-production', function(cb) {
     env = 'production';
     cb();
});

gulp.task('set-development', function(cb) {
    env = 'development';
    cb();
});

gulp.task('build', gulp.series('set-production', clean, 'sass', 'templates', 'fonts', 'client-js', 'babel', 'copy'));
gulp.task('devbuild', gulp.series('set-development', clean, 'sass', 'templates', 'fonts', 'client-js', 'lit-html', 'babel', 'copy'));

gulp.task('default', gulp.series('build'));
gulp.task('dev', gulp.series('devbuild', 'watch'));
