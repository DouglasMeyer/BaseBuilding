var gulp = require('gulp');
var add = require('gulp-add-src');
var browserify = require('browserify');
var del = require('del');
var eventStream = require('event-stream');
var glob = require('glob');
var gutil = require('gulp-util');
var less = require('gulp-less');
var minifyCSS = require('gulp-minify-css');
var mocha = require('gulp-mocha');
var noop = gutil.noop;
var notify = require('gulp-notify');
var path = require('path');
var proxyquire = require('proxyquireify');
var source = require('vinyl-source-stream');
var through = require('through2');
var watchify = require('watchify');

// Dev only
var livereload, injectReload, watch;

var C = {
  dev: false,
  port: process.env.PORT || 4000,
  lrPort: 35729 + Math.floor(Math.random() * 100),
  paths: {
    script: './src/game.js',
    styles: 'src/**/*.less',
    markup: 'src/**/*.html',
    copy: [
      'src/**/*.png',
      'src/**/*.jpg',
      'src/**/*.json',
      'src/lib/pixi-3.0.7.js',
    ]
  }
};

function onEnd(callback){
  return through.obj(null, null, function(cb){
    cb();
    callback();
  });
}

gulp.task('clean', function(cb){
  del(['dist/**'], cb);
});

gulp.task('copy', function(){
  var p = C.paths.copy;
  return gulp.src(p)
    .pipe( C.dev ? watch(p)                        : noop())
    .pipe(         gulp.dest('dist')                       )
    .pipe( C.dev ? livereload()                    : noop());
});

gulp.task('webserver', function(){
  var connect = require('connect');
  var serveStatic = require('serve-static');
  var http = require('http');
  var path = require('path');

  var base = path.resolve('dist');
  var app = connect().use(serveStatic(base));
  return http.createServer(app).listen(C.port, null);
});

gulp.task('scripts', [ '_scripts' ], function(){
  if (C.dev) {
    gulp.watch('dist/**/*.js', ['test']);
  }
});
gulp.task('_scripts', function(){
  return glob(C.paths.script, function(err, files){
    if (err) throw err;

    // Gulp: Creating multiple bundles with Browserify:
    // http://fettblog.eu/gulp-browserify-multiple-bundles/
    return eventStream.merge.apply(null, files.map(function(file){

      var bundle = browserify({
        cache: {},
        packageCache: {},
        debug: true // source maps
      })
      .plugin(proxyquire.plugin)
      .require(require.resolve(file), { entry: true });

      if (C.dev){
        bundle = watchify(bundle);
        bundle.on('update', function(files){
          gulp.emit('task_start', { task: 'scripts update' });
          var start = process.hrtime();
          buildBundle()
            .pipe(onEnd(function(){
              gulp.emit('task_stop', { task: 'scripts update', hrDuration: process.hrtime(start) });
              gulp.start([ 'test' ]);
            }));
        });
      }
      return buildBundle()
        .pipe(onEnd(function(){
          if (C.dev){
            gulp.start([ 'test' ]);
          }
        }));

      function buildBundle(){
        return bundle.bundle()
        .on('error', function(e){
          notify.onError({
            title: "Compile Error",
            message: "<%= error %>"
          }).apply(this, arguments);
          this.emit('end');
        })
        .pipe(source(path.relative('./src', file)))
        .pipe(gulp.dest('./dist/'))
        .pipe( C.dev ? livereload() : noop() );
      }

    }));
  });
});

gulp.task('styles', function(){
  var p = C.paths.styles;
  return gulp.src(p)
    .pipe( C.dev ? watch(p)          : noop() )
    .pipe(         less()                     )
    .pipe(         minifyCSS()                )
    .pipe(         gulp.dest('dist')          )
    .pipe( C.dev ? livereload()      : noop() );
});

gulp.task('markup', function(){
  var p = C.paths.markup;
  return gulp.src(p)
    .pipe( C.dev ? watch(p)                         : noop() )
    .pipe( C.dev ? injectReload({ port: C.lrPort }) : noop() )
    .pipe(         gulp.dest('dist')                         )
    .pipe( C.dev ? livereload()                     : noop() );
});

gulp.task('test', function(){
  return gulp
    .src(['src/spec/support/setup.js', 'src/spec/**/*_spec.js'], {read: false})
    .pipe(mocha({
      reporter: 'dot',
      globals: [ 'stub', 'spy', 'expect', 'window', 'PIXI' ]
    }));
});

gulp.task('build', [/*'clean'*/], function(){
  gulp.start(['markup', 'scripts', 'styles', 'copy']);
});

gulp.task('default', function(){
  C.dev = true;
  livereload   = require('gulp-livereload');
  injectReload = require('gulp-inject-reload');
  watch        = require('gulp-watch');

  livereload.listen({ port: C.lrPort });
  gulp.start([ 'webserver', 'build' ]);
});
