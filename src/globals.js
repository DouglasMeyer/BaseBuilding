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

//FIXME: Do I want to be extending natives?
Array.prototype.substitute = function ArrayPSubstitute(/* startIndex, endIndex, content */){
  const startIndex = Math.max(0, Math.min(this.length-1, arguments[0], arguments[1])),
        endIndex = Math.min(this.length-1, Math.max(0, arguments[0], arguments[1])),
        reverse = arguments[0] > arguments[1];
  var content = arguments[2];
  if (typeof content === 'function') {
    var replacedContent = this.slice(startIndex, endIndex+1);
    if (reverse) replacedContent.reverse();
    content = content(replacedContent);
  }
  if (reverse) content.reverse();
  return this.slice(0, startIndex)
    .concat(content,
      this.slice(endIndex+1)
    );
};
