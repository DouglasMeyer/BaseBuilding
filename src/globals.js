global.mod = function mod(a,b){
  var ap = a;
  while (ap < 0) ap += b;
  return ap % b;
};

global.extend = function extend(dest /*, srcs...*/){
  Array.prototype.slice.call(arguments, 1)
  .forEach(function(src){
    for (var key in src){
      dest[key] = src[key];
    }
  });
  return dest;
};

global.copyWith = function copyWith(src, updates){
  var copy = extend({}, src);
  for (var key in updates){
    var isArray = Array.isArray(updates[key]),
        isObject = typeof updates[key] === 'object';
    if (isArray || !isObject){
      copy[key] = updates[key];
    } else {
      copy[key] = copyWith(copy[key], updates[key]);
    }
  }
  return copy;
};

global.memoize = function memoize(fn){
  var oldArgs, oldRet;
  return function memoized(){
    var same = !!oldArgs;
    for (var i in arguments){
      same = same && oldArgs[i] === arguments[i];
    }
    if (!same) oldRet = fn.apply(this, arguments);
    oldArgs = arguments;
    return oldRet;
  };
};

global.random = function random(max, min, random){
  min = min || 0;
  return min + (max - min) * (random || Math.random());
};
