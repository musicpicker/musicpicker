var gulp = require('gulp');
var concat = require('gulp-concat');
var bower = require('gulp-bower');
var react = require('gulp-react');
var uglify = require('gulp-uglify');
var minifyCss = require('gulp-minify-css');
var mainBowerFiles = require('main-bower-files');

gulp.task('default', ['build']);
gulp.task('build', ['app', 'vendor', 'style'], function() {
  return gulp.src('client/index.html')
    .pipe(gulp.dest('public/'));
});

gulp.task('app', function() {
  return gulp.src(['client/js/**/*.js', 'client/js/**/*.jsx'])
    .pipe(react())
    .pipe(concat('app.js'))
    .pipe(uglify())
    .pipe(gulp.dest('public/'));
});

gulp.task('vendor', ['bower'], function() {
  return gulp.src(mainBowerFiles('**/*.js'))
    .pipe(concat('vendor.js'))
    .pipe(uglify())
    .pipe(gulp.dest('public/'));
});

gulp.task('style', ['bower'], function() {
  return gulp.src(mainBowerFiles('**/*.css'))
    .pipe(concat('style.css'))
    .pipe(minifyCss())
    .pipe(gulp.dest('public/'));
});

gulp.task('bower', function() {
  return bower();
});
