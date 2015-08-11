var gulp = require('gulp');
var bower = require('gulp-bower');
var less = require('gulp-less');
var uglify = require('gulp-uglify');
var minifyCss = require('gulp-minify-css');
var mainBowerFiles = require('main-bower-files');
var source = require('vinyl-source-stream');
var buffer = require('vinyl-buffer');
var browserify = require('browserify');
var reactify = require('reactify');

gulp.task('default', ['build']);
gulp.task('build', ['app', 'styles']);

gulp.task('app', function() {
  return browserify({
      entries: ['./client/js/start.js'],
      transform: [reactify],
      standalone: 'musicpicker'
    })
    .bundle()
    .pipe(source('app.js'))
    .pipe(buffer())
    .pipe(uglify())
    .pipe(gulp.dest('static/'));
})

gulp.task('styles', ['bower', 'fonts'], function() {
  return gulp.src('client/styles.less')
    .pipe(less())
    .pipe(minifyCss())
    .pipe(gulp.dest('static/'));
});

gulp.task('fonts', ['bower'], function() {
  return gulp.src(mainBowerFiles('**/fonts/**'))
    .pipe(gulp.dest('static/fonts'));
});

gulp.task('bower', function() {
  return bower();
});
