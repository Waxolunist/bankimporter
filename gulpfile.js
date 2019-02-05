var sourcemaps = require('gulp-sourcemaps');
var gulp = require('gulp');
var babel = require('gulp-babel');
var sass = require('gulp-sass');
var jade = require('gulp-jade');
var gzip = require('gulp-gzip');
var uglify = require('gulp-uglify');
var pump = require('pump');
var clean = require('gulp-clean');
var runSequence = require('run-sequence');
var newer = require('gulp-newer');
var merge = require('merge-stream');

gulp.task('clean', function(cb) {
  return gulp.src('dist', {read: false})
    .pipe(clean());
});

gulp.task('sass', function() {
  return gulp.src('src/sass/csvstore.sass')
    .pipe(sourcemaps.init())
    .pipe(sass({outputStyle: env === 'production' ? 'compressed' : ''}).on('error', sass.logError))
    .pipe(sourcemaps.write('.'))
    //.pipe(gzip())
    .pipe(gulp.dest('dist/css'));
});

gulp.task('templates', function() {
  gulp.src('src/templates/*.jade')
    .pipe(jade({
      locals: {}
    }))
    .pipe(gzip())
    .pipe(gulp.dest('dist/html'))
});

gulp.task('fonts', function() {
  return gulp.src([
      'src/fonts/*.ttf',
      'node_modules/font-awesome/fonts/*.*'])
    .pipe(gzip())
    .pipe(gulp.dest('dist/fonts'));
});

gulp.task('client-js', function(cb) {
  pump([
    gulp.src([
      'node_modules/jquery/dist/jquery.js',
      'node_modules/signals/dist/signals.js',
      'node_modules/hasher/dist/js/hasher.js',
      'node_modules/crossroads/dist/crossroads.js',
      'src/js/*.js']),
    //sourcemaps.init(),
    //uglify(),
    //sourcemaps.write('.'),
    gzip(),
    gulp.dest('dist/js')
  ], cb);
});

gulp.task('copy', function(cb) {
  pump([
    gulp.src(['src/lib/scrapers/*.js']),
    gulp.dest('dist/lib/scrapers')
  ], cb);
});

gulp.task('babel', function() {
  var server = gulp.src(['src/server.js'])
          .pipe(newer('dist'))
          .pipe(babel({
              presets: ["es2015", "stage-0"]
          }))
          .pipe(gulp.dest('dist'));

  var parsers = gulp.src(['src/lib/parsers/*.js'])
          .pipe(newer('dist/lib/parsers'))
          .pipe(babel({
              presets: ["es2015", "stage-0"]
          }))
          .pipe(gulp.dest('dist/lib/parsers'));
  var scrapers = gulp.src(['src/lib/scrapers/*.js'])
          .pipe(newer('dist/lib/scrapers'))
          .pipe(babel({
              presets: ["es2015", "stage-0"]
          }))
          .pipe(gulp.dest('dist/lib/scrapers'));
  return merge(server, parsers, scrapers);
});

var watch = function() {
  gulp.watch(['src/sass/csvstore.sass'], ['sass']);
  gulp.watch(['src/templates/*.jade'], ['templates']);
  gulp.watch(['src/js/*.js'], ['client-js']);
  gulp.watch(['src/server.js', 'src/lib/parsers/*'], ['babel']);
  gulp.watch(['src/lib/scrapers/*'], ['copy']);
};

gulp.task('set-production', function() {
  env = 'production';
});

gulp.task('set-development', function() {
  env = 'development';
});

gulp.task('build', function(cb) {
  runSequence('set-production', 'clean', ['sass', 'templates', 'fonts', 'client-js', 'babel', 'copy'], cb);
});

gulp.task('devbuild', function(cb) {
  runSequence('set-development', ['sass', 'templates', 'fonts', 'client-js', 'babel', 'copy'], cb);
});

gulp.task('default', ['build']);
gulp.task('dev', ['devbuild'], watch);
