var gulp = require('gulp');
var concat = require('gulp-concat');
var bower = require('gulp-bower');
var less = require('gulp-less');
var react = require('gulp-react');
var uglify = require('gulp-uglify');
var minifyCss = require('gulp-minify-css');
var mainBowerFiles = require('main-bower-files');

gulp.task('default', ['build']);
gulp.task('build', ['app', 'vendor', 'styles']);

gulp.task('app', function() {
  return gulp.src(['client/js/**/*.js', 'client/js/**/*.jsx'])
    .pipe(react())
    .pipe(concat('app.js'))
    .pipe(uglify())
    .pipe(gulp.dest('static/'));
});

gulp.task('vendor', ['bower'], function() {
  return gulp.src(mainBowerFiles('**/*.js'))
    .pipe(concat('vendor.js'))
    .pipe(uglify())
    .pipe(gulp.dest('static/'));
});

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
