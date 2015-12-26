// modules are defined as an array
// [ module function, map of requireuires ]
//
// map of requireuires is short require name -> numeric require
//
// anything defined in a previous bundle is accessed via the
// orig method which is the requireuire for previous bundles

(function outer (modules, cache, entry) {
    // Save the require from previous bundle to this closure if any
    var previousRequire = typeof require == "function" && require;

    function findProxyquireifyName() {
        var deps = Object.keys(modules)
            .map(function (k) { return modules[k][1]; });

        for (var i = 0; i < deps.length; i++) {
            var pq = deps[i]['proxyquireify'];
            if (pq) return pq;
        }
    }

    var proxyquireifyName = findProxyquireifyName();

    function newRequire(name, jumped){
        // Find the proxyquireify module, if present
        var pqify = (proxyquireifyName != null) && cache[proxyquireifyName];

        // Proxyquireify provides a separate cache that is used when inside
        // a proxyquire call, and is set to null outside a proxyquire call.
        // This allows the regular caching semantics to work correctly both
        // inside and outside proxyquire calls while keeping the cached
        // modules isolated.
        // When switching from one proxyquire call to another, it clears
        // the cache to prevent contamination between different sets
        // of stubs.
        var currentCache = (pqify && pqify.exports._cache) || cache;

        if(!currentCache[name]) {
            if(!modules[name]) {
                // if we cannot find the the module within our internal map or
                // cache jump to the current global require ie. the last bundle
                // that was added to the page.
                var currentRequire = typeof require == "function" && require;
                if (!jumped && currentRequire) return currentRequire(name, true);

                // If there are other bundles on this page the require from the
                // previous one is saved to 'previousRequire'. Repeat this as
                // many times as there are bundles until the module is found or
                // we exhaust the require chain.
                if (previousRequire) return previousRequire(name, true);
                var err = new Error('Cannot find module \'' + name + '\'');
                err.code = 'MODULE_NOT_FOUND';
                throw err;
            }
            var m = currentCache[name] = {exports:{}};

            // The normal browserify require function
            var req = function(x){
                var id = modules[name][1][x];
                return newRequire(id ? id : x);
            };

            // The require function substituted for proxyquireify
            var moduleRequire = function(x){
                var pqify = (proxyquireifyName != null) && cache[proxyquireifyName];
                // Only try to use the proxyquireify version if it has been `require`d
                if (pqify && pqify.exports._proxy) {
                    return pqify.exports._proxy(req, x);
                } else {
                    return req(x);
                }
            };

            modules[name][0].call(m.exports,moduleRequire,m,m.exports,outer,modules,currentCache,entry);
        }
        return currentCache[name].exports;
    }
    for(var i=0;i<entry.length;i++) newRequire(entry[i]);

    // Override the current require with this new one
    return newRequire;
})
({1:[function(require,module,exports){
function addAction(name, defaultArgs, fn){
  if (!fn) {
    fn = defaultArgs;
    defaultArgs = undefined;
  }
  actions[name] = function(){
    var args = Array.prototype.slice.apply(arguments);
    updateState(function(gameState){
      return fn.apply(null, args.concat([gameState]));
    });
  };
  if (defaultArgs){
    actions[name].setDefault = function(){
      actions[name].apply(null, defaultArgs);
    };
    if (updateState) actions[name].setDefault();
  }
}

var updateState,
    postSetUpdateState = [],
    actions = {
      setUpdateState: function(upSt){
        updateState = upSt;
        for (var name in actions){
          if (actions[name].setDefault) actions[name].setDefault();
        }
      }
    };

module.exports = actions;


addAction('setTileEditType', ['floor'], function(tileType, gameState){
  if (tileType === gameState.tileEditType) return;

  return copyWith(gameState, {
    tileEditType: tileType
  });
});

addAction('forceReRender', function(gameState){
  return copyWith(gameState, {});
});

addAction('startTileSelection', function(point, gameState){
  return copyWith(gameState, {
    world: {
      selection: {
        start: point,
        end: point
      }
    }
  });
});

addAction('continueTileSelection', function(point, gameState){
  return copyWith(gameState, {
    world: {
      selection: {
        end: point
      }
    }
  });
});

addAction('endTileSelection', function(point, gameState){
  const tiles = gameState.world.tiles,
        start = gameState.world.selection.start,
        end = point,
        newTiles = tiles.substitute(start.y, end.y, function(rows){
          var tileType = gameState.tileEditType;
          return rows.map(function(row){
            return row.substitute(start.x, end.x, function(tiles){
              return tiles.map(function(tile){
                if (tile.type !== tileType) {
                  return copyWith(tile, { type: gameState.tileEditType });
                } else {
                  return tile;
                }
              });
            });
          });
        });

  return copyWith(gameState, {
    world: {
      selection: undefined,
      tiles: newTiles
    }
  });
});

},{}],2:[function(require,module,exports){
require('./globals');
var input = require('./input'),
    Output = require('./output'),
    output = new Output(),
    tick = require('./tick'),
    update = require('./update'),
    setUpdateState = require('./actions').setUpdateState,
    gameState = {},

    game = {
      run: function(){
        setUpdateState(function(fn){
          gameState = fn(gameState) || gameState;
        });
        tick(function gameTick(timeDelta){
          gameState = update(
            timeDelta,
            input.get(),
            gameState
          );
          output.render(gameState);
        });
      }
    };

if (typeof window !== 'undefined'){
  window.game = game;
  game.run();
}
module.exports = game;

},{"./actions":1,"./globals":3,"./input":4,"./output":5,"./tick":12,"./update":13}],3:[function(require,module,exports){
(function (global){
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

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
//# sourceMappingURL=data:application/json;charset:utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbInNyYy9nbG9iYWxzLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbImdsb2JhbC5tb2QgPSBmdW5jdGlvbiBtb2QoYSxiKXtcbiAgdmFyIGFwID0gYTtcbiAgd2hpbGUgKGFwIDwgMCkgYXAgKz0gYjtcbiAgcmV0dXJuIGFwICUgYjtcbn07XG5cbmdsb2JhbC5leHRlbmQgPSBmdW5jdGlvbiBleHRlbmQoZGVzdCAvKiwgc3Jjcy4uLiovKXtcbiAgQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJndW1lbnRzLCAxKVxuICAuZm9yRWFjaChmdW5jdGlvbihzcmMpe1xuICAgIGZvciAodmFyIGtleSBpbiBzcmMpe1xuICAgICAgZGVzdFtrZXldID0gc3JjW2tleV07XG4gICAgfVxuICB9KTtcbiAgcmV0dXJuIGRlc3Q7XG59O1xuXG5nbG9iYWwuY29weVdpdGggPSBmdW5jdGlvbiBjb3B5V2l0aChzcmMsIHVwZGF0ZXMpe1xuICB2YXIgY29weSA9IGV4dGVuZCh7fSwgc3JjKTtcbiAgZm9yICh2YXIga2V5IGluIHVwZGF0ZXMpe1xuICAgIHZhciBpc0FycmF5ID0gQXJyYXkuaXNBcnJheSh1cGRhdGVzW2tleV0pLFxuICAgICAgICBpc09iamVjdCA9IHR5cGVvZiB1cGRhdGVzW2tleV0gPT09ICdvYmplY3QnO1xuICAgIGlmIChpc0FycmF5IHx8ICFpc09iamVjdCl7XG4gICAgICBjb3B5W2tleV0gPSB1cGRhdGVzW2tleV07XG4gICAgfSBlbHNlIHtcbiAgICAgIGNvcHlba2V5XSA9IGNvcHlXaXRoKGNvcHlba2V5XSwgdXBkYXRlc1trZXldKTtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIGNvcHk7XG59O1xuXG5nbG9iYWwubWVtb2l6ZSA9IGZ1bmN0aW9uIG1lbW9pemUoZm4pe1xuICB2YXIgb2xkQXJncywgb2xkUmV0O1xuICByZXR1cm4gZnVuY3Rpb24gbWVtb2l6ZWQoKXtcbiAgICB2YXIgc2FtZSA9ICEhb2xkQXJncztcbiAgICBmb3IgKHZhciBpIGluIGFyZ3VtZW50cyl7XG4gICAgICBzYW1lID0gc2FtZSAmJiBvbGRBcmdzW2ldID09PSBhcmd1bWVudHNbaV07XG4gICAgfVxuICAgIGlmICghc2FtZSkgb2xkUmV0ID0gZm4uYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICBvbGRBcmdzID0gYXJndW1lbnRzO1xuICAgIHJldHVybiBvbGRSZXQ7XG4gIH07XG59O1xuXG5nbG9iYWwucmFuZG9tID0gZnVuY3Rpb24gcmFuZG9tKG1heCwgbWluLCByYW5kb20pe1xuICBtaW4gPSBtaW4gfHwgMDtcbiAgcmV0dXJuIG1pbiArIChtYXggLSBtaW4pICogKHJhbmRvbSB8fCBNYXRoLnJhbmRvbSgpKTtcbn07XG5cbi8vRklYTUU6IERvIEkgd2FudCB0byBiZSBleHRlbmRpbmcgbmF0aXZlcz9cbkFycmF5LnByb3RvdHlwZS5zdWJzdGl0dXRlID0gZnVuY3Rpb24gQXJyYXlQU3Vic3RpdHV0ZSgvKiBzdGFydEluZGV4LCBlbmRJbmRleCwgY29udGVudCAqLyl7XG4gIGNvbnN0IHN0YXJ0SW5kZXggPSBNYXRoLm1heCgwLCBNYXRoLm1pbih0aGlzLmxlbmd0aC0xLCBhcmd1bWVudHNbMF0sIGFyZ3VtZW50c1sxXSkpLFxuICAgICAgICBlbmRJbmRleCA9IE1hdGgubWluKHRoaXMubGVuZ3RoLTEsIE1hdGgubWF4KDAsIGFyZ3VtZW50c1swXSwgYXJndW1lbnRzWzFdKSksXG4gICAgICAgIHJldmVyc2UgPSBhcmd1bWVudHNbMF0gPiBhcmd1bWVudHNbMV07XG4gIHZhciBjb250ZW50ID0gYXJndW1lbnRzWzJdO1xuICBpZiAodHlwZW9mIGNvbnRlbnQgPT09ICdmdW5jdGlvbicpIHtcbiAgICB2YXIgcmVwbGFjZWRDb250ZW50ID0gdGhpcy5zbGljZShzdGFydEluZGV4LCBlbmRJbmRleCsxKTtcbiAgICBpZiAocmV2ZXJzZSkgcmVwbGFjZWRDb250ZW50LnJldmVyc2UoKTtcbiAgICBjb250ZW50ID0gY29udGVudChyZXBsYWNlZENvbnRlbnQpO1xuICB9XG4gIGlmIChyZXZlcnNlKSBjb250ZW50LnJldmVyc2UoKTtcbiAgcmV0dXJuIHRoaXMuc2xpY2UoMCwgc3RhcnRJbmRleClcbiAgICAuY29uY2F0KGNvbnRlbnQsXG4gICAgICB0aGlzLnNsaWNlKGVuZEluZGV4KzEpXG4gICAgKTtcbn07XG4iXX0=
},{}],4:[function(require,module,exports){
var mouse = {},
    window = {};

function onMouseDown(e){
  e.preventDefault();
  mouse = copyWith(mouse, {
    button: e.button === 0 ? 'left' : 'right'
  });
  return false;
}
function onMouseUp(e){
  e.preventDefault();
  mouse = copyWith(mouse, {
    button: undefined
  });
}
function onMouseMove(e){
  e.preventDefault();
  mouse = copyWith(mouse, {
    x: e.x,
    y: e.y
  });
}
function onScroll(e){
  mouse = copyWith(mouse, {
    scrollX: e.deltaX,
    scrollY: e.deltaY
  })
}
function onResize(e){
  window = {
    width:  document.body.clientWidth,
    height: document.body.clientHeight
  };
}
document.body.addEventListener('mousemove', onMouseMove);
document.body.addEventListener('mousedown', onMouseDown);
document.body.addEventListener('mouseup',   onMouseUp);
addEventListener('mousewheel', onScroll); //FIXME: should this be 'wheel'?
addEventListener('contextmenu', function(e){ e.preventDefault(); });
addEventListener('resize', onResize);
addEventListener('mousedown', function(e){
  this.focus();
});

onResize();

module.exports.get = function inputGet(){
  return {
    mouse: mouse,
    window: window
  };
};

},{}],5:[function(require,module,exports){
var WorldContainer = require('./output/world_container'),
    TilesContainer = require('./output/tiles_container'),
    SelectionContainer = require('./output/selection_container'),
    HudContainer = require('./output/hud_container'),
    renderer, stage,
    worldContainer,
      tilesContainer,
      selectionContainer,
    hudContainer;

function Output(){
  renderer = renderer || PIXI.autoDetectRenderer();
  document.body.appendChild(renderer.view);

  stage = new PIXI.Container();
  stage.addChild( worldContainer = new WorldContainer() );
  worldContainer.addChild( tilesContainer = new TilesContainer() );
  worldContainer.addChild( selectionContainer = new SelectionContainer() );
  stage.addChild( hudContainer = new HudContainer() );
};

Output.prototype.render = memoize(function outputRender(gameState){
  hudContainer.render(gameState);
  worldContainer.render(gameState);
  tilesContainer.render(gameState);
  selectionContainer.render(gameState);

  renderer.resize(gameState.windowSize.width, gameState.windowSize.height);
  renderer.render(stage);
});

module.exports = Output;

},{"./output/hud_container":7,"./output/selection_container":9,"./output/tiles_container":10,"./output/world_container":11}],6:[function(require,module,exports){
"use strict";
var NinePatch = require('./nine_patch'),
    forceReRender = require('../actions').forceReRender;

module.exports = class Button extends PIXI.Container {
  static get textures(){
    if (this._textures) return this._textures;
    this._textures = {
      default: PIXI.Texture.fromImage('resources/blue_button06.png'),
      hover:   PIXI.Texture.fromImage('resources/blue_button09.png'),
      active:  PIXI.Texture.fromImage('resources/blue_button10.png')
    }
    return this._textures;
  }

  constructor(text, action, width, height){
    super();
    this.action = action;
    this.state = 'default';
    this.bg = new NinePatch(Button.textures['default'], 6, 6, 8, 6);
    this.addChild( this.bg );
    this.text = new PIXI.Text(text, {font : '18px Arial'});
    this.addChild( this.text );
    this.bg.width  = width;
    this.bg.height = height;
    this.text.anchor = { x: 0.5, y: 0.6 };
    this.text.position.x = width / 2;
    this.text.position.y = height / 2;

    this.interactive = true;
    this.mouseover = this.onOver;
    this.mouseout = this.onOut;
    this.mousedown = this.onDown;
    this.mouseup = this.onUp;
  }

  updateSprite(){
    var state = this.isDown ? 'active' : ((this.forceHover || this.isOver) ? 'hover' : 'default');
    if (this.bg.texture === Button.textures[state]) return;
    this.bg.texture = Button.textures[state];
    forceReRender();
  }

  onOver(e){
    this.isOver = true;
    this.updateSprite();
  }
  onOut(e){
    this.isOver = false;
    this.isDown = false;
    this.updateSprite();
  }
  onDown(e){
    this.isDown = true;
    this.action();
    this.updateSprite();
  }
  onUp(e){
    this.isDown = false;
    this.updateSprite();
  }
}

},{"../actions":1,"./nine_patch":8}],7:[function(require,module,exports){
"use strict";
var setTileEditType = require('../actions').setTileEditType,
    Button = require('./button');

class HudContainer extends PIXI.Container {
  static get textures(){
    return [
      Button.textures.default,
      Button.textures.hover,
      Button.textures.active
    ];
  }

  constructor(){
    super();
    window.button = this.buldozeButton = new Button('Buldoze', setTileEditType.bind(null, 'empty'), 150, 40);
    this.addChild(this.buldozeButton);
    this.buildFloorButton = new Button('Build Floor', setTileEditType.bind(null, 'floor'), 150, 40);
    this.addChild(this.buildFloorButton);
  }

  render(gameState){
    this.renderHud(gameState.windowSize, gameState.tileEditType);
  }

  renderHud(windowSize, tileEditType){
    this.buldozeButton.position.x = 5;
    this.buldozeButton.position.y = windowSize.height - 40 - 5;
    this.buldozeButton.forceHover = tileEditType === 'empty';
    this.buldozeButton.updateSprite();

    this.buildFloorButton.position.x = 5;
    this.buildFloorButton.position.y = this.buldozeButton.position.y - 40 - 5;
    this.buildFloorButton.forceHover = tileEditType === 'floor';
    this.buildFloorButton.updateSprite();
  }
}
HudContainer.prototype.renderHud = memoize(HudContainer.prototype.renderHud);

module.exports = HudContainer;

},{"../actions":1,"./button":6}],8:[function(require,module,exports){
"use strict";

function createPatch(texture, x, y, width, height){
  var boarderSprite = new PIXI.Sprite(new PIXI.Texture(texture,
    new PIXI.Rectangle(x, y, width, height)
  ));
  boarderSprite.position.x = x;
  boarderSprite.position.y = y;
  this.addChild( boarderSprite );
  return boarderSprite;
}

function positionPatch(){
  if (!this.top) return;

  this.top.scale.x = this.center.scale.x = this.bottom.scale.x = 1;
  this.top.width = this.center.width = this.bottom.width = this._width - this.borderSizes.left - this.borderSizes.right;
  this.topRight.position.x = this.right.position.x = this.bottomRight.position.x = this._width - this.borderSizes.right;

  this.left.scale.y = this.center.scale.y = this.right.scale.y = 1;
  this.left.height = this.center.height = this.right.height = this._height - this.borderSizes.top - this.borderSizes.bottom;
  this.center.width = this._width - this.borderSizes.left - this.borderSizes.right;

  this.bottomLeft.position.y = this.bottom.position.y = this.bottomRight.position.y = this._height - this.borderSizes.bottom;
}

module.exports = class NinePatch extends PIXI.Container {
  constructor(texture, top, right, bottom, left){
    super();
    this.borderSizes = {
      top: top,
      right: right,
      bottom: bottom,
      left: left
    };
    this.texture = texture;
  }

  updateTexture(texture){
    if (!this._width) this._width = texture.width;
    if (!this._height) this._height = texture.height;

    var innerWidth = texture.width - this.borderSizes.left - this.borderSizes.right,
        innerHeight = texture.height - this.borderSizes.top - this.borderSizes.bottom;
    if (innerWidth <= 0 || innerHeight <= 0) return;

    this.topLeft = createPatch.call(this, texture,
      0,0, this.borderSizes.left, this.borderSizes.top);
    this.top = createPatch.call(this, texture,
      this.borderSizes.left, 0, innerWidth, this.borderSizes.top);
    this.topRight = createPatch.call(this, texture,
      texture.width-this.borderSizes.right, 0, this.borderSizes.right, this.borderSizes.top);

    this.left = createPatch.call(this, texture,
      0, this.borderSizes.top, this.borderSizes.left, innerHeight);
    this.center = createPatch.call(this, texture,
      this.borderSizes.left, this.borderSizes.top, innerWidth, innerHeight);
    this.right = createPatch.call(this, texture,
      texture.width-this.borderSizes.right, this.borderSizes.top, this.borderSizes.right, innerHeight);

    this.bottomLeft = createPatch.call(this, texture,
      0, texture.height-this.borderSizes.bottom, this.borderSizes.left, this.borderSizes.bottom);
    this.bottom = createPatch.call(this, texture,
      this.borderSizes.left, texture.height-this.borderSizes.bottom, innerWidth, this.borderSizes.bottom);
    this.bottomRight = createPatch.call(this, texture,
      texture.width-this.borderSizes.right, texture.height-this.borderSizes.bottom, this.borderSizes.right, this.borderSizes.bottom);

    positionPatch.call(this);
  }

  get texture(){
    return this._texture;
  }
  set texture(texture){
    this._texture = texture;
    this.updateTexture(texture);
    texture.once('update', this.updateTexture.bind(this));
  }

  get width(){
    return this._width;
  }
  set width(width){
    this._width = width;
    positionPatch.call(this);
  }

  get height(){
    return this._height;
  }
  set height(height){
    this._height = height;
    positionPatch.call(this);
  }
};

},{}],9:[function(require,module,exports){
"use strict";

class SelectionContainer extends PIXI.Container {
  static get textures(){
    return [
      SelectionGraphic.texture
    ];
  }

  constructor(){
    super()
    this.selectionMap = {};
  }
  render(gameState){
    if (!gameState.world.selection) {
      if (Object.keys(this.selectionMap).length){
        this.removeChildren();
        this.selectionMap = {};
      }
      return;
    }
    let scale = gameState.world.scale,
        center = gameState.world.center,
        height = gameState.windowSize.height / scale,
        width  = gameState.windowSize.width  / scale,
        selection = gameState.world.selection,
        minX = Math.min(selection.start.x, selection.end.x),
        maxX = Math.max(selection.start.x, selection.end.x),
        minY = Math.min(selection.start.y, selection.end.y),
        maxY = Math.max(selection.start.y, selection.end.y);

    this.renderSelection(gameState.world.selection, minY, maxY, minX, maxX, scale);
  }
  renderSelection(selection, minY, maxY, minX, maxX, scale){

    for (let y in this.selectionMap){
      for (let x in this.selectionMap[y]){
        if (x<minX || x>maxX || y<minY || y>maxY){
          this.removeChild(this.selectionMap[y][x]);
          delete this.selectionMap[y][x];
        }
      }
      if (y<minY || y>maxY){
        delete this.selectionMap[y];
      }
    }
    for (let y=minY; y<=maxY; y++){
      if (!this.selectionMap[y]) this.selectionMap[y] = {};
      for (let x=minX; x<=maxX; x++){
        if (!this.selectionMap[y][x]) {
          this.selectionMap[y][x] = new SelectionGraphic(x,y, scale);
          this.addChild( this.selectionMap[y][x] );
        }
      }
    }
  }
}
SelectionContainer.prototype.renderSelection = memoize(SelectionContainer.prototype.renderSelection);

class SelectionGraphic extends PIXI.Sprite {
  static get texture(){
    if (this._texture) return this._texture;
    this._texture = PIXI.Texture.fromImage('resources/CursorCircle.png');
    return this._texture;
  }

  constructor(x,y,scale){
    super(SelectionGraphic.texture);
    this.position.x = x*scale;
    this.position.y = y*scale;
    this.height = this.width = scale;
  }
}

module.exports = SelectionContainer;

},{}],10:[function(require,module,exports){
"use strict";

var actions = require('../actions'),
    startTileSelection = actions.startTileSelection,
    continueTileSelection = actions.continueTileSelection,
    endTileSelection = actions.endTileSelection;

function pointFromEvent(e){
  var x = Math.floor((e.data.global.x - this.parent.position.x) / this.worldScale),
      y = Math.floor((e.data.global.y - this.parent.position.y) / this.worldScale);
  return { x, y };
}

class TilesContainer extends PIXI.Container {
  static get textures(){
    return [
      FloorGraphic.texture
    ];
  }

  constructor(){
    super();
    this.tileMap = {};

    this.interactive = true;
  }
  render(gameState){
    let scale = gameState.world.scale,
        size = gameState.world.size,
        center = gameState.world.center,
        height = gameState.windowSize.height / scale,
        width  = gameState.windowSize.width  / scale,
        minY = Math.max(0,    Math.floor(center.y-height/2)),
        maxY = Math.min(size, Math.ceil( center.y+height/2)),
        minX = Math.max(0,    Math.floor(center.x-width /2)),
        maxX = Math.min(size, Math.ceil( center.x+width /2));

    this.worldScale = scale;

    this.renderMap(gameState.world.tiles, minY, maxY, minX, maxX, scale);
  }
  renderMap(tiles, minY, maxY, minX, maxX, scale){
    this.hitArea = new PIXI.Rectangle(0,0, 100*scale,100*scale);

    for (let y in this.tileMap){
      for (let x in this.tileMap[y]){
        if (this.tileMap[y][x] !== tiles[y][x] || x<minX || x>maxX || y<minY || y>maxY){
          this.removeChild(this.tileMap[y][x]);
          delete this.tileMap[y][x];
        }
      }
      if (y<minY || y>maxY){
        delete this.tileMap[y];
      }
    }
    for (let y=minY; y<maxY; y++){
      if (!this.tileMap[y]) this.tileMap[y] = {};
      for (let x=minX; x<maxX; x++){
        if (!this.tileMap[y][x]) {
          this.tileMap[y][x] = this.getTile(tiles, x,y, scale);
          this.addChild( this.tileMap[y][x] );
        }
      }
    }
  }
  getTile(tiles, x, y, scale){
    const tile = tiles[y][x];
    if (tile.type === 'empty') {
      return new PIXI.Container();
    } else if (tile.type === 'floor') {
      return new FloorGraphic(x,y, scale);
    } else {
      throw new Error("TilesContainer#getTile: Unknown tile type: "+tile.type);
    }
  }
  mousedown(e){
    var point = pointFromEvent.call(this, e);
    startTileSelection(point);
    this.isSelecting = true;
  }
  mousemove(e){
    if (!this.isSelecting) return;
    var point = pointFromEvent.call(this, e);
    continueTileSelection(point);
  }
  mouseup(e){
    var point = pointFromEvent.call(this, e);
    endTileSelection(point);
    this.isSelecting = false;
  }
  // mouseout(e){
  // }
}
TilesContainer.prototype.renderMap = memoize(TilesContainer.prototype.renderMap);

class FloorGraphic extends PIXI.Sprite {
  static get texture(){
    if (this._texture) return this._texture;
    this._texture = PIXI.Texture.fromImage('resources/Floor.png');
    return this._texture;
  }

  constructor(x,y,scale){
    super(FloorGraphic.texture);
    this.position.x = x*scale;
    this.position.y = y*scale;
    this.height = this.width = scale;
  }
}

module.exports = TilesContainer;

},{"../actions":1}],11:[function(require,module,exports){
"use strict";

class WorldContainer extends PIXI.Container {
  render(gameState){
    this.renderWorld(gameState.world.center, gameState.windowSize, gameState.world.scale);
  }
  renderWorld(center, windowSize, scale){
    this.position.x = windowSize.width  / 2 - center.x * scale;
    this.position.y = windowSize.height / 2 - center.y * scale;
  }
}
WorldContainer.prototype.renderWorld = memoize(WorldContainer.prototype.renderWorld);

module.exports = WorldContainer;

},{}],12:[function(require,module,exports){
var callback, lastTime;

function onTick(time){
  requestAnimationFrame(onTick);
  if (!window.pause) callback(time - lastTime);
  lastTime = time;
}

module.exports = function initTick(cb){
  if (callback) throw "tick called more than once!"
  requestAnimationFrame(onTick);
  callback = cb;
  lastTime = performance.now();
};

},{}],13:[function(require,module,exports){
var changeState = require('./update/change_state'),
    resizeWindow = require('./update/resize_window'),
    loadTextures = require('./update/load_textures'),
    moveScreen = require('./update/move_screen');

module.exports = function update(timeDelta, input, gameState){
  return [
    changeState.bind(null, input),
    loadTextures,
    resizeWindow.bind(null, input),
    moveScreen.bind(null, input),
  ].reduce(function updateReduceChanges(gameState, f){ return f(gameState) || gameState; }, gameState);
};

},{"./update/change_state":14,"./update/load_textures":15,"./update/move_screen":16,"./update/resize_window":17}],14:[function(require,module,exports){
/*
 * undefined --start--> 'playing'
 */

function start(gameState){
  var newGameState = copyWith(gameState, {
    state: 'playing',
    world: {
      size: 100,
      tiles: []
    }
  });

  for (var y=0;y<newGameState.world.size;y++){
    var row = [];
    newGameState.world.tiles.push(row);
    for (var x=0;x<newGameState.world.size;x++){
      row.push({
        type: Math.random() > 0.5 ? 'empty' : 'floor',
        // looseObject: null,
        // installedObject: null,
        // x: x,
        // y: y
      });
    }
  }
  return newGameState;
}

module.exports = function changeState(input, gameState){
  switch(gameState.state){

    case undefined:
      return start(gameState);

    case 'playing':
      break;

    default:
      console.error('unknown gameState', gameState.state);
      return copyWith(gameState, {
        state: undefined
      });
  }
};

},{}],15:[function(require,module,exports){
var TilesContainer = require('../output/tiles_container'),
    containerTexturesToLoad = [
      TilesContainer.textures
    ],
    texturesToLoad = Array.prototype.concat.apply([], containerTexturesToLoad),
    loadedTextureCount = 0;

texturesToLoad.forEach(function(texture){
  texture.once('update', function(){
    loadedTextureCount += 1;
  });
});

module.exports = function loadTextures(gameState){
  if (gameState.loadedTextureCount === loadedTextureCount) return;

  return copyWith(gameState, {
    loadedTextureCount: loadedTextureCount
  });
};

},{"../output/tiles_container":10}],16:[function(require,module,exports){
var panStart;

var memoizedMoveScreen = memoize(function(mouse, gameState){
  if (!gameState.world || !gameState.world.center){
    gameState = copyWith(gameState, {
      world: {
        scale: 32,
        center: { x: 0, y: 0 }
      }
    });
  }

  if (mouse.scrollY){
    var scale = gameState.world.scale,
        newScale = Math.min(100, Math.max(20,
          scale - mouse.scrollY / scale
        ));
    if (newScale !== scale) {
      gameState = copyWith(gameState, {
        world: {
          scale: newScale
        }
      });
    }
  }

  if (mouse.button === 'right'){
    if (!panStart){
      panStart = {
        mouse,
        center: gameState.world.center
      };
    } else {
      const centerX = (panStart.mouse.x - mouse.x) / gameState.world.scale + panStart.center.x,
            centerY = (panStart.mouse.y - mouse.y) / gameState.world.scale + panStart.center.y;
      if (
        centerX !== gameState.world.center.x ||
        centerY !== gameState.world.center.y
      ){
        gameState = copyWith(gameState, {
          world: { center: {
            x: centerX,
            y: centerY
          }}
        });
      }
    }
  } else if (panStart){
    panStart = null;
  }

  return gameState;
});

module.exports = function moveScreen(input, gameState){
  return memoizedMoveScreen(input.mouse, gameState);
};

},{}],17:[function(require,module,exports){
var oldWindow;

module.exports = function resizeWindow(input, gameState){
  if (input.window === oldWindow) return;
  oldWindow = input.window;

  return copyWith(gameState, {
    windowSize: input.window
  });
};

},{}]},{},[2])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi9Vc2Vycy9kb3VnbGFzL0NvZGUvUGVyc29uYWwvR2FtZV9CYXNlX0J1aWxkaW5nL25vZGVfbW9kdWxlcy9wcm94eXF1aXJlaWZ5L2xpYi9wcmVsdWRlLmpzIiwic3JjL2FjdGlvbnMuanMiLCJzcmMvZ2FtZS5qcyIsInNyYy9nbG9iYWxzLmpzIiwic3JjL2lucHV0LmpzIiwic3JjL291dHB1dC5qcyIsInNyYy9vdXRwdXQvYnV0dG9uLmpzIiwic3JjL291dHB1dC9odWRfY29udGFpbmVyLmpzIiwic3JjL291dHB1dC9uaW5lX3BhdGNoLmpzIiwic3JjL291dHB1dC9zZWxlY3Rpb25fY29udGFpbmVyLmpzIiwic3JjL291dHB1dC90aWxlc19jb250YWluZXIuanMiLCJzcmMvb3V0cHV0L3dvcmxkX2NvbnRhaW5lci5qcyIsInNyYy90aWNrLmpzIiwic3JjL3VwZGF0ZS5qcyIsInNyYy91cGRhdGUvY2hhbmdlX3N0YXRlLmpzIiwic3JjL3VwZGF0ZS9sb2FkX3RleHR1cmVzLmpzIiwic3JjL3VwZGF0ZS9tb3ZlX3NjcmVlbi5qcyIsInNyYy91cGRhdGUvcmVzaXplX3dpbmRvdy5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUNuRkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzVGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3BFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDckRBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzlEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDL0ZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzNFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMvR0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNkQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzdDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3pEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIvLyBtb2R1bGVzIGFyZSBkZWZpbmVkIGFzIGFuIGFycmF5XG4vLyBbIG1vZHVsZSBmdW5jdGlvbiwgbWFwIG9mIHJlcXVpcmV1aXJlcyBdXG4vL1xuLy8gbWFwIG9mIHJlcXVpcmV1aXJlcyBpcyBzaG9ydCByZXF1aXJlIG5hbWUgLT4gbnVtZXJpYyByZXF1aXJlXG4vL1xuLy8gYW55dGhpbmcgZGVmaW5lZCBpbiBhIHByZXZpb3VzIGJ1bmRsZSBpcyBhY2Nlc3NlZCB2aWEgdGhlXG4vLyBvcmlnIG1ldGhvZCB3aGljaCBpcyB0aGUgcmVxdWlyZXVpcmUgZm9yIHByZXZpb3VzIGJ1bmRsZXNcblxuKGZ1bmN0aW9uIG91dGVyIChtb2R1bGVzLCBjYWNoZSwgZW50cnkpIHtcbiAgICAvLyBTYXZlIHRoZSByZXF1aXJlIGZyb20gcHJldmlvdXMgYnVuZGxlIHRvIHRoaXMgY2xvc3VyZSBpZiBhbnlcbiAgICB2YXIgcHJldmlvdXNSZXF1aXJlID0gdHlwZW9mIHJlcXVpcmUgPT0gXCJmdW5jdGlvblwiICYmIHJlcXVpcmU7XG5cbiAgICBmdW5jdGlvbiBmaW5kUHJveHlxdWlyZWlmeU5hbWUoKSB7XG4gICAgICAgIHZhciBkZXBzID0gT2JqZWN0LmtleXMobW9kdWxlcylcbiAgICAgICAgICAgIC5tYXAoZnVuY3Rpb24gKGspIHsgcmV0dXJuIG1vZHVsZXNba11bMV07IH0pO1xuXG4gICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgZGVwcy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgdmFyIHBxID0gZGVwc1tpXVsncHJveHlxdWlyZWlmeSddO1xuICAgICAgICAgICAgaWYgKHBxKSByZXR1cm4gcHE7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICB2YXIgcHJveHlxdWlyZWlmeU5hbWUgPSBmaW5kUHJveHlxdWlyZWlmeU5hbWUoKTtcblxuICAgIGZ1bmN0aW9uIG5ld1JlcXVpcmUobmFtZSwganVtcGVkKXtcbiAgICAgICAgLy8gRmluZCB0aGUgcHJveHlxdWlyZWlmeSBtb2R1bGUsIGlmIHByZXNlbnRcbiAgICAgICAgdmFyIHBxaWZ5ID0gKHByb3h5cXVpcmVpZnlOYW1lICE9IG51bGwpICYmIGNhY2hlW3Byb3h5cXVpcmVpZnlOYW1lXTtcblxuICAgICAgICAvLyBQcm94eXF1aXJlaWZ5IHByb3ZpZGVzIGEgc2VwYXJhdGUgY2FjaGUgdGhhdCBpcyB1c2VkIHdoZW4gaW5zaWRlXG4gICAgICAgIC8vIGEgcHJveHlxdWlyZSBjYWxsLCBhbmQgaXMgc2V0IHRvIG51bGwgb3V0c2lkZSBhIHByb3h5cXVpcmUgY2FsbC5cbiAgICAgICAgLy8gVGhpcyBhbGxvd3MgdGhlIHJlZ3VsYXIgY2FjaGluZyBzZW1hbnRpY3MgdG8gd29yayBjb3JyZWN0bHkgYm90aFxuICAgICAgICAvLyBpbnNpZGUgYW5kIG91dHNpZGUgcHJveHlxdWlyZSBjYWxscyB3aGlsZSBrZWVwaW5nIHRoZSBjYWNoZWRcbiAgICAgICAgLy8gbW9kdWxlcyBpc29sYXRlZC5cbiAgICAgICAgLy8gV2hlbiBzd2l0Y2hpbmcgZnJvbSBvbmUgcHJveHlxdWlyZSBjYWxsIHRvIGFub3RoZXIsIGl0IGNsZWFyc1xuICAgICAgICAvLyB0aGUgY2FjaGUgdG8gcHJldmVudCBjb250YW1pbmF0aW9uIGJldHdlZW4gZGlmZmVyZW50IHNldHNcbiAgICAgICAgLy8gb2Ygc3R1YnMuXG4gICAgICAgIHZhciBjdXJyZW50Q2FjaGUgPSAocHFpZnkgJiYgcHFpZnkuZXhwb3J0cy5fY2FjaGUpIHx8IGNhY2hlO1xuXG4gICAgICAgIGlmKCFjdXJyZW50Q2FjaGVbbmFtZV0pIHtcbiAgICAgICAgICAgIGlmKCFtb2R1bGVzW25hbWVdKSB7XG4gICAgICAgICAgICAgICAgLy8gaWYgd2UgY2Fubm90IGZpbmQgdGhlIHRoZSBtb2R1bGUgd2l0aGluIG91ciBpbnRlcm5hbCBtYXAgb3JcbiAgICAgICAgICAgICAgICAvLyBjYWNoZSBqdW1wIHRvIHRoZSBjdXJyZW50IGdsb2JhbCByZXF1aXJlIGllLiB0aGUgbGFzdCBidW5kbGVcbiAgICAgICAgICAgICAgICAvLyB0aGF0IHdhcyBhZGRlZCB0byB0aGUgcGFnZS5cbiAgICAgICAgICAgICAgICB2YXIgY3VycmVudFJlcXVpcmUgPSB0eXBlb2YgcmVxdWlyZSA9PSBcImZ1bmN0aW9uXCIgJiYgcmVxdWlyZTtcbiAgICAgICAgICAgICAgICBpZiAoIWp1bXBlZCAmJiBjdXJyZW50UmVxdWlyZSkgcmV0dXJuIGN1cnJlbnRSZXF1aXJlKG5hbWUsIHRydWUpO1xuXG4gICAgICAgICAgICAgICAgLy8gSWYgdGhlcmUgYXJlIG90aGVyIGJ1bmRsZXMgb24gdGhpcyBwYWdlIHRoZSByZXF1aXJlIGZyb20gdGhlXG4gICAgICAgICAgICAgICAgLy8gcHJldmlvdXMgb25lIGlzIHNhdmVkIHRvICdwcmV2aW91c1JlcXVpcmUnLiBSZXBlYXQgdGhpcyBhc1xuICAgICAgICAgICAgICAgIC8vIG1hbnkgdGltZXMgYXMgdGhlcmUgYXJlIGJ1bmRsZXMgdW50aWwgdGhlIG1vZHVsZSBpcyBmb3VuZCBvclxuICAgICAgICAgICAgICAgIC8vIHdlIGV4aGF1c3QgdGhlIHJlcXVpcmUgY2hhaW4uXG4gICAgICAgICAgICAgICAgaWYgKHByZXZpb3VzUmVxdWlyZSkgcmV0dXJuIHByZXZpb3VzUmVxdWlyZShuYW1lLCB0cnVlKTtcbiAgICAgICAgICAgICAgICB2YXIgZXJyID0gbmV3IEVycm9yKCdDYW5ub3QgZmluZCBtb2R1bGUgXFwnJyArIG5hbWUgKyAnXFwnJyk7XG4gICAgICAgICAgICAgICAgZXJyLmNvZGUgPSAnTU9EVUxFX05PVF9GT1VORCc7XG4gICAgICAgICAgICAgICAgdGhyb3cgZXJyO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdmFyIG0gPSBjdXJyZW50Q2FjaGVbbmFtZV0gPSB7ZXhwb3J0czp7fX07XG5cbiAgICAgICAgICAgIC8vIFRoZSBub3JtYWwgYnJvd3NlcmlmeSByZXF1aXJlIGZ1bmN0aW9uXG4gICAgICAgICAgICB2YXIgcmVxID0gZnVuY3Rpb24oeCl7XG4gICAgICAgICAgICAgICAgdmFyIGlkID0gbW9kdWxlc1tuYW1lXVsxXVt4XTtcbiAgICAgICAgICAgICAgICByZXR1cm4gbmV3UmVxdWlyZShpZCA/IGlkIDogeCk7XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICAvLyBUaGUgcmVxdWlyZSBmdW5jdGlvbiBzdWJzdGl0dXRlZCBmb3IgcHJveHlxdWlyZWlmeVxuICAgICAgICAgICAgdmFyIG1vZHVsZVJlcXVpcmUgPSBmdW5jdGlvbih4KXtcbiAgICAgICAgICAgICAgICB2YXIgcHFpZnkgPSAocHJveHlxdWlyZWlmeU5hbWUgIT0gbnVsbCkgJiYgY2FjaGVbcHJveHlxdWlyZWlmeU5hbWVdO1xuICAgICAgICAgICAgICAgIC8vIE9ubHkgdHJ5IHRvIHVzZSB0aGUgcHJveHlxdWlyZWlmeSB2ZXJzaW9uIGlmIGl0IGhhcyBiZWVuIGByZXF1aXJlYGRcbiAgICAgICAgICAgICAgICBpZiAocHFpZnkgJiYgcHFpZnkuZXhwb3J0cy5fcHJveHkpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHBxaWZ5LmV4cG9ydHMuX3Byb3h5KHJlcSwgeCk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHJlcSh4KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICBtb2R1bGVzW25hbWVdWzBdLmNhbGwobS5leHBvcnRzLG1vZHVsZVJlcXVpcmUsbSxtLmV4cG9ydHMsb3V0ZXIsbW9kdWxlcyxjdXJyZW50Q2FjaGUsZW50cnkpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBjdXJyZW50Q2FjaGVbbmFtZV0uZXhwb3J0cztcbiAgICB9XG4gICAgZm9yKHZhciBpPTA7aTxlbnRyeS5sZW5ndGg7aSsrKSBuZXdSZXF1aXJlKGVudHJ5W2ldKTtcblxuICAgIC8vIE92ZXJyaWRlIHRoZSBjdXJyZW50IHJlcXVpcmUgd2l0aCB0aGlzIG5ldyBvbmVcbiAgICByZXR1cm4gbmV3UmVxdWlyZTtcbn0pXG4iLCJmdW5jdGlvbiBhZGRBY3Rpb24obmFtZSwgZGVmYXVsdEFyZ3MsIGZuKXtcbiAgaWYgKCFmbikge1xuICAgIGZuID0gZGVmYXVsdEFyZ3M7XG4gICAgZGVmYXVsdEFyZ3MgPSB1bmRlZmluZWQ7XG4gIH1cbiAgYWN0aW9uc1tuYW1lXSA9IGZ1bmN0aW9uKCl7XG4gICAgdmFyIGFyZ3MgPSBBcnJheS5wcm90b3R5cGUuc2xpY2UuYXBwbHkoYXJndW1lbnRzKTtcbiAgICB1cGRhdGVTdGF0ZShmdW5jdGlvbihnYW1lU3RhdGUpe1xuICAgICAgcmV0dXJuIGZuLmFwcGx5KG51bGwsIGFyZ3MuY29uY2F0KFtnYW1lU3RhdGVdKSk7XG4gICAgfSk7XG4gIH07XG4gIGlmIChkZWZhdWx0QXJncyl7XG4gICAgYWN0aW9uc1tuYW1lXS5zZXREZWZhdWx0ID0gZnVuY3Rpb24oKXtcbiAgICAgIGFjdGlvbnNbbmFtZV0uYXBwbHkobnVsbCwgZGVmYXVsdEFyZ3MpO1xuICAgIH07XG4gICAgaWYgKHVwZGF0ZVN0YXRlKSBhY3Rpb25zW25hbWVdLnNldERlZmF1bHQoKTtcbiAgfVxufVxuXG52YXIgdXBkYXRlU3RhdGUsXG4gICAgcG9zdFNldFVwZGF0ZVN0YXRlID0gW10sXG4gICAgYWN0aW9ucyA9IHtcbiAgICAgIHNldFVwZGF0ZVN0YXRlOiBmdW5jdGlvbih1cFN0KXtcbiAgICAgICAgdXBkYXRlU3RhdGUgPSB1cFN0O1xuICAgICAgICBmb3IgKHZhciBuYW1lIGluIGFjdGlvbnMpe1xuICAgICAgICAgIGlmIChhY3Rpb25zW25hbWVdLnNldERlZmF1bHQpIGFjdGlvbnNbbmFtZV0uc2V0RGVmYXVsdCgpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfTtcblxubW9kdWxlLmV4cG9ydHMgPSBhY3Rpb25zO1xuXG5cbmFkZEFjdGlvbignc2V0VGlsZUVkaXRUeXBlJywgWydmbG9vciddLCBmdW5jdGlvbih0aWxlVHlwZSwgZ2FtZVN0YXRlKXtcbiAgaWYgKHRpbGVUeXBlID09PSBnYW1lU3RhdGUudGlsZUVkaXRUeXBlKSByZXR1cm47XG5cbiAgcmV0dXJuIGNvcHlXaXRoKGdhbWVTdGF0ZSwge1xuICAgIHRpbGVFZGl0VHlwZTogdGlsZVR5cGVcbiAgfSk7XG59KTtcblxuYWRkQWN0aW9uKCdmb3JjZVJlUmVuZGVyJywgZnVuY3Rpb24oZ2FtZVN0YXRlKXtcbiAgcmV0dXJuIGNvcHlXaXRoKGdhbWVTdGF0ZSwge30pO1xufSk7XG5cbmFkZEFjdGlvbignc3RhcnRUaWxlU2VsZWN0aW9uJywgZnVuY3Rpb24ocG9pbnQsIGdhbWVTdGF0ZSl7XG4gIHJldHVybiBjb3B5V2l0aChnYW1lU3RhdGUsIHtcbiAgICB3b3JsZDoge1xuICAgICAgc2VsZWN0aW9uOiB7XG4gICAgICAgIHN0YXJ0OiBwb2ludCxcbiAgICAgICAgZW5kOiBwb2ludFxuICAgICAgfVxuICAgIH1cbiAgfSk7XG59KTtcblxuYWRkQWN0aW9uKCdjb250aW51ZVRpbGVTZWxlY3Rpb24nLCBmdW5jdGlvbihwb2ludCwgZ2FtZVN0YXRlKXtcbiAgcmV0dXJuIGNvcHlXaXRoKGdhbWVTdGF0ZSwge1xuICAgIHdvcmxkOiB7XG4gICAgICBzZWxlY3Rpb246IHtcbiAgICAgICAgZW5kOiBwb2ludFxuICAgICAgfVxuICAgIH1cbiAgfSk7XG59KTtcblxuYWRkQWN0aW9uKCdlbmRUaWxlU2VsZWN0aW9uJywgZnVuY3Rpb24ocG9pbnQsIGdhbWVTdGF0ZSl7XG4gIGNvbnN0IHRpbGVzID0gZ2FtZVN0YXRlLndvcmxkLnRpbGVzLFxuICAgICAgICBzdGFydCA9IGdhbWVTdGF0ZS53b3JsZC5zZWxlY3Rpb24uc3RhcnQsXG4gICAgICAgIGVuZCA9IHBvaW50LFxuICAgICAgICBuZXdUaWxlcyA9IHRpbGVzLnN1YnN0aXR1dGUoc3RhcnQueSwgZW5kLnksIGZ1bmN0aW9uKHJvd3Mpe1xuICAgICAgICAgIHZhciB0aWxlVHlwZSA9IGdhbWVTdGF0ZS50aWxlRWRpdFR5cGU7XG4gICAgICAgICAgcmV0dXJuIHJvd3MubWFwKGZ1bmN0aW9uKHJvdyl7XG4gICAgICAgICAgICByZXR1cm4gcm93LnN1YnN0aXR1dGUoc3RhcnQueCwgZW5kLngsIGZ1bmN0aW9uKHRpbGVzKXtcbiAgICAgICAgICAgICAgcmV0dXJuIHRpbGVzLm1hcChmdW5jdGlvbih0aWxlKXtcbiAgICAgICAgICAgICAgICBpZiAodGlsZS50eXBlICE9PSB0aWxlVHlwZSkge1xuICAgICAgICAgICAgICAgICAgcmV0dXJuIGNvcHlXaXRoKHRpbGUsIHsgdHlwZTogZ2FtZVN0YXRlLnRpbGVFZGl0VHlwZSB9KTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgcmV0dXJuIHRpbGU7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcblxuICByZXR1cm4gY29weVdpdGgoZ2FtZVN0YXRlLCB7XG4gICAgd29ybGQ6IHtcbiAgICAgIHNlbGVjdGlvbjogdW5kZWZpbmVkLFxuICAgICAgdGlsZXM6IG5ld1RpbGVzXG4gICAgfVxuICB9KTtcbn0pO1xuIiwicmVxdWlyZSgnLi9nbG9iYWxzJyk7XG52YXIgaW5wdXQgPSByZXF1aXJlKCcuL2lucHV0JyksXG4gICAgT3V0cHV0ID0gcmVxdWlyZSgnLi9vdXRwdXQnKSxcbiAgICBvdXRwdXQgPSBuZXcgT3V0cHV0KCksXG4gICAgdGljayA9IHJlcXVpcmUoJy4vdGljaycpLFxuICAgIHVwZGF0ZSA9IHJlcXVpcmUoJy4vdXBkYXRlJyksXG4gICAgc2V0VXBkYXRlU3RhdGUgPSByZXF1aXJlKCcuL2FjdGlvbnMnKS5zZXRVcGRhdGVTdGF0ZSxcbiAgICBnYW1lU3RhdGUgPSB7fSxcblxuICAgIGdhbWUgPSB7XG4gICAgICBydW46IGZ1bmN0aW9uKCl7XG4gICAgICAgIHNldFVwZGF0ZVN0YXRlKGZ1bmN0aW9uKGZuKXtcbiAgICAgICAgICBnYW1lU3RhdGUgPSBmbihnYW1lU3RhdGUpIHx8IGdhbWVTdGF0ZTtcbiAgICAgICAgfSk7XG4gICAgICAgIHRpY2soZnVuY3Rpb24gZ2FtZVRpY2sodGltZURlbHRhKXtcbiAgICAgICAgICBnYW1lU3RhdGUgPSB1cGRhdGUoXG4gICAgICAgICAgICB0aW1lRGVsdGEsXG4gICAgICAgICAgICBpbnB1dC5nZXQoKSxcbiAgICAgICAgICAgIGdhbWVTdGF0ZVxuICAgICAgICAgICk7XG4gICAgICAgICAgb3V0cHV0LnJlbmRlcihnYW1lU3RhdGUpO1xuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICB9O1xuXG5pZiAodHlwZW9mIHdpbmRvdyAhPT0gJ3VuZGVmaW5lZCcpe1xuICB3aW5kb3cuZ2FtZSA9IGdhbWU7XG4gIGdhbWUucnVuKCk7XG59XG5tb2R1bGUuZXhwb3J0cyA9IGdhbWU7XG4iLCIoZnVuY3Rpb24gKGdsb2JhbCl7XG5nbG9iYWwubW9kID0gZnVuY3Rpb24gbW9kKGEsYil7XG4gIHZhciBhcCA9IGE7XG4gIHdoaWxlIChhcCA8IDApIGFwICs9IGI7XG4gIHJldHVybiBhcCAlIGI7XG59O1xuXG5nbG9iYWwuZXh0ZW5kID0gZnVuY3Rpb24gZXh0ZW5kKGRlc3QgLyosIHNyY3MuLi4qLyl7XG4gIEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZ3VtZW50cywgMSlcbiAgLmZvckVhY2goZnVuY3Rpb24oc3JjKXtcbiAgICBmb3IgKHZhciBrZXkgaW4gc3JjKXtcbiAgICAgIGRlc3Rba2V5XSA9IHNyY1trZXldO1xuICAgIH1cbiAgfSk7XG4gIHJldHVybiBkZXN0O1xufTtcblxuZ2xvYmFsLmNvcHlXaXRoID0gZnVuY3Rpb24gY29weVdpdGgoc3JjLCB1cGRhdGVzKXtcbiAgdmFyIGNvcHkgPSBleHRlbmQoe30sIHNyYyk7XG4gIGZvciAodmFyIGtleSBpbiB1cGRhdGVzKXtcbiAgICB2YXIgaXNBcnJheSA9IEFycmF5LmlzQXJyYXkodXBkYXRlc1trZXldKSxcbiAgICAgICAgaXNPYmplY3QgPSB0eXBlb2YgdXBkYXRlc1trZXldID09PSAnb2JqZWN0JztcbiAgICBpZiAoaXNBcnJheSB8fCAhaXNPYmplY3Qpe1xuICAgICAgY29weVtrZXldID0gdXBkYXRlc1trZXldO1xuICAgIH0gZWxzZSB7XG4gICAgICBjb3B5W2tleV0gPSBjb3B5V2l0aChjb3B5W2tleV0sIHVwZGF0ZXNba2V5XSk7XG4gICAgfVxuICB9XG4gIHJldHVybiBjb3B5O1xufTtcblxuZ2xvYmFsLm1lbW9pemUgPSBmdW5jdGlvbiBtZW1vaXplKGZuKXtcbiAgdmFyIG9sZEFyZ3MsIG9sZFJldDtcbiAgcmV0dXJuIGZ1bmN0aW9uIG1lbW9pemVkKCl7XG4gICAgdmFyIHNhbWUgPSAhIW9sZEFyZ3M7XG4gICAgZm9yICh2YXIgaSBpbiBhcmd1bWVudHMpe1xuICAgICAgc2FtZSA9IHNhbWUgJiYgb2xkQXJnc1tpXSA9PT0gYXJndW1lbnRzW2ldO1xuICAgIH1cbiAgICBpZiAoIXNhbWUpIG9sZFJldCA9IGZuLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgb2xkQXJncyA9IGFyZ3VtZW50cztcbiAgICByZXR1cm4gb2xkUmV0O1xuICB9O1xufTtcblxuZ2xvYmFsLnJhbmRvbSA9IGZ1bmN0aW9uIHJhbmRvbShtYXgsIG1pbiwgcmFuZG9tKXtcbiAgbWluID0gbWluIHx8IDA7XG4gIHJldHVybiBtaW4gKyAobWF4IC0gbWluKSAqIChyYW5kb20gfHwgTWF0aC5yYW5kb20oKSk7XG59O1xuXG4vL0ZJWE1FOiBEbyBJIHdhbnQgdG8gYmUgZXh0ZW5kaW5nIG5hdGl2ZXM/XG5BcnJheS5wcm90b3R5cGUuc3Vic3RpdHV0ZSA9IGZ1bmN0aW9uIEFycmF5UFN1YnN0aXR1dGUoLyogc3RhcnRJbmRleCwgZW5kSW5kZXgsIGNvbnRlbnQgKi8pe1xuICBjb25zdCBzdGFydEluZGV4ID0gTWF0aC5tYXgoMCwgTWF0aC5taW4odGhpcy5sZW5ndGgtMSwgYXJndW1lbnRzWzBdLCBhcmd1bWVudHNbMV0pKSxcbiAgICAgICAgZW5kSW5kZXggPSBNYXRoLm1pbih0aGlzLmxlbmd0aC0xLCBNYXRoLm1heCgwLCBhcmd1bWVudHNbMF0sIGFyZ3VtZW50c1sxXSkpLFxuICAgICAgICByZXZlcnNlID0gYXJndW1lbnRzWzBdID4gYXJndW1lbnRzWzFdO1xuICB2YXIgY29udGVudCA9IGFyZ3VtZW50c1syXTtcbiAgaWYgKHR5cGVvZiBjb250ZW50ID09PSAnZnVuY3Rpb24nKSB7XG4gICAgdmFyIHJlcGxhY2VkQ29udGVudCA9IHRoaXMuc2xpY2Uoc3RhcnRJbmRleCwgZW5kSW5kZXgrMSk7XG4gICAgaWYgKHJldmVyc2UpIHJlcGxhY2VkQ29udGVudC5yZXZlcnNlKCk7XG4gICAgY29udGVudCA9IGNvbnRlbnQocmVwbGFjZWRDb250ZW50KTtcbiAgfVxuICBpZiAocmV2ZXJzZSkgY29udGVudC5yZXZlcnNlKCk7XG4gIHJldHVybiB0aGlzLnNsaWNlKDAsIHN0YXJ0SW5kZXgpXG4gICAgLmNvbmNhdChjb250ZW50LFxuICAgICAgdGhpcy5zbGljZShlbmRJbmRleCsxKVxuICAgICk7XG59O1xuXG59KS5jYWxsKHRoaXMsdHlwZW9mIGdsb2JhbCAhPT0gXCJ1bmRlZmluZWRcIiA/IGdsb2JhbCA6IHR5cGVvZiBzZWxmICE9PSBcInVuZGVmaW5lZFwiID8gc2VsZiA6IHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIgPyB3aW5kb3cgOiB7fSlcbi8vIyBzb3VyY2VNYXBwaW5nVVJMPWRhdGE6YXBwbGljYXRpb24vanNvbjtjaGFyc2V0OnV0Zi04O2Jhc2U2NCxleUoyWlhKemFXOXVJam96TENKemIzVnlZMlZ6SWpwYkluTnlZeTluYkc5aVlXeHpMbXB6SWwwc0ltNWhiV1Z6SWpwYlhTd2liV0Z3Y0dsdVozTWlPaUk3UVVGQlFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRWlMQ0ptYVd4bElqb2laMlZ1WlhKaGRHVmtMbXB6SWl3aWMyOTFjbU5sVW05dmRDSTZJaUlzSW5OdmRYSmpaWE5EYjI1MFpXNTBJanBiSW1kc2IySmhiQzV0YjJRZ1BTQm1kVzVqZEdsdmJpQnRiMlFvWVN4aUtYdGNiaUFnZG1GeUlHRndJRDBnWVR0Y2JpQWdkMmhwYkdVZ0tHRndJRHdnTUNrZ1lYQWdLejBnWWp0Y2JpQWdjbVYwZFhKdUlHRndJQ1VnWWp0Y2JuMDdYRzVjYm1kc2IySmhiQzVsZUhSbGJtUWdQU0JtZFc1amRHbHZiaUJsZUhSbGJtUW9aR1Z6ZENBdktpd2djM0pqY3k0dUxpb3ZLWHRjYmlBZ1FYSnlZWGt1Y0hKdmRHOTBlWEJsTG5Oc2FXTmxMbU5oYkd3b1lYSm5kVzFsYm5SekxDQXhLVnh1SUNBdVptOXlSV0ZqYUNobWRXNWpkR2x2YmloemNtTXBlMXh1SUNBZ0lHWnZjaUFvZG1GeUlHdGxlU0JwYmlCemNtTXBlMXh1SUNBZ0lDQWdaR1Z6ZEZ0clpYbGRJRDBnYzNKalcydGxlVjA3WEc0Z0lDQWdmVnh1SUNCOUtUdGNiaUFnY21WMGRYSnVJR1JsYzNRN1hHNTlPMXh1WEc1bmJHOWlZV3d1WTI5d2VWZHBkR2dnUFNCbWRXNWpkR2x2YmlCamIzQjVWMmwwYUNoemNtTXNJSFZ3WkdGMFpYTXBlMXh1SUNCMllYSWdZMjl3ZVNBOUlHVjRkR1Z1WkNoN2ZTd2djM0pqS1R0Y2JpQWdabTl5SUNoMllYSWdhMlY1SUdsdUlIVndaR0YwWlhNcGUxeHVJQ0FnSUhaaGNpQnBjMEZ5Y21GNUlEMGdRWEp5WVhrdWFYTkJjbkpoZVNoMWNHUmhkR1Z6VzJ0bGVWMHBMRnh1SUNBZ0lDQWdJQ0JwYzA5aWFtVmpkQ0E5SUhSNWNHVnZaaUIxY0dSaGRHVnpXMnRsZVYwZ1BUMDlJQ2R2WW1wbFkzUW5PMXh1SUNBZ0lHbG1JQ2hwYzBGeWNtRjVJSHg4SUNGcGMwOWlhbVZqZENsN1hHNGdJQ0FnSUNCamIzQjVXMnRsZVYwZ1BTQjFjR1JoZEdWelcydGxlVjA3WEc0Z0lDQWdmU0JsYkhObElIdGNiaUFnSUNBZ0lHTnZjSGxiYTJWNVhTQTlJR052Y0hsWGFYUm9LR052Y0hsYmEyVjVYU3dnZFhCa1lYUmxjMXRyWlhsZEtUdGNiaUFnSUNCOVhHNGdJSDFjYmlBZ2NtVjBkWEp1SUdOdmNIazdYRzU5TzF4dVhHNW5iRzlpWVd3dWJXVnRiMmw2WlNBOUlHWjFibU4wYVc5dUlHMWxiVzlwZW1Vb1ptNHBlMXh1SUNCMllYSWdiMnhrUVhKbmN5d2diMnhrVW1WME8xeHVJQ0J5WlhSMWNtNGdablZ1WTNScGIyNGdiV1Z0YjJsNlpXUW9LWHRjYmlBZ0lDQjJZWElnYzJGdFpTQTlJQ0VoYjJ4a1FYSm5jenRjYmlBZ0lDQm1iM0lnS0haaGNpQnBJR2x1SUdGeVozVnRaVzUwY3lsN1hHNGdJQ0FnSUNCellXMWxJRDBnYzJGdFpTQW1KaUJ2YkdSQmNtZHpXMmxkSUQwOVBTQmhjbWQxYldWdWRITmJhVjA3WEc0Z0lDQWdmVnh1SUNBZ0lHbG1JQ2doYzJGdFpTa2diMnhrVW1WMElEMGdabTR1WVhCd2JIa29kR2hwY3l3Z1lYSm5kVzFsYm5SektUdGNiaUFnSUNCdmJHUkJjbWR6SUQwZ1lYSm5kVzFsYm5Sek8xeHVJQ0FnSUhKbGRIVnliaUJ2YkdSU1pYUTdYRzRnSUgwN1hHNTlPMXh1WEc1bmJHOWlZV3d1Y21GdVpHOXRJRDBnWm5WdVkzUnBiMjRnY21GdVpHOXRLRzFoZUN3Z2JXbHVMQ0J5WVc1a2IyMHBlMXh1SUNCdGFXNGdQU0J0YVc0Z2ZId2dNRHRjYmlBZ2NtVjBkWEp1SUcxcGJpQXJJQ2h0WVhnZ0xTQnRhVzRwSUNvZ0tISmhibVJ2YlNCOGZDQk5ZWFJvTG5KaGJtUnZiU2dwS1R0Y2JuMDdYRzVjYmk4dlJrbFlUVVU2SUVSdklFa2dkMkZ1ZENCMGJ5QmlaU0JsZUhSbGJtUnBibWNnYm1GMGFYWmxjejljYmtGeWNtRjVMbkJ5YjNSdmRIbHdaUzV6ZFdKemRHbDBkWFJsSUQwZ1puVnVZM1JwYjI0Z1FYSnlZWGxRVTNWaWMzUnBkSFYwWlNndktpQnpkR0Z5ZEVsdVpHVjRMQ0JsYm1SSmJtUmxlQ3dnWTI5dWRHVnVkQ0FxTHlsN1hHNGdJR052Ym5OMElITjBZWEowU1c1a1pYZ2dQU0JOWVhSb0xtMWhlQ2d3TENCTllYUm9MbTFwYmloMGFHbHpMbXhsYm1kMGFDMHhMQ0JoY21kMWJXVnVkSE5iTUYwc0lHRnlaM1Z0Wlc1MGMxc3hYU2twTEZ4dUlDQWdJQ0FnSUNCbGJtUkpibVJsZUNBOUlFMWhkR2d1YldsdUtIUm9hWE11YkdWdVozUm9MVEVzSUUxaGRHZ3ViV0Y0S0RBc0lHRnlaM1Z0Wlc1MGMxc3dYU3dnWVhKbmRXMWxiblJ6V3pGZEtTa3NYRzRnSUNBZ0lDQWdJSEpsZG1WeWMyVWdQU0JoY21kMWJXVnVkSE5iTUYwZ1BpQmhjbWQxYldWdWRITmJNVjA3WEc0Z0lIWmhjaUJqYjI1MFpXNTBJRDBnWVhKbmRXMWxiblJ6V3pKZE8xeHVJQ0JwWmlBb2RIbHdaVzltSUdOdmJuUmxiblFnUFQwOUlDZG1kVzVqZEdsdmJpY3BJSHRjYmlBZ0lDQjJZWElnY21Wd2JHRmpaV1JEYjI1MFpXNTBJRDBnZEdocGN5NXpiR2xqWlNoemRHRnlkRWx1WkdWNExDQmxibVJKYm1SbGVDc3hLVHRjYmlBZ0lDQnBaaUFvY21WMlpYSnpaU2tnY21Wd2JHRmpaV1JEYjI1MFpXNTBMbkpsZG1WeWMyVW9LVHRjYmlBZ0lDQmpiMjUwWlc1MElEMGdZMjl1ZEdWdWRDaHlaWEJzWVdObFpFTnZiblJsYm5RcE8xeHVJQ0I5WEc0Z0lHbG1JQ2h5WlhabGNuTmxLU0JqYjI1MFpXNTBMbkpsZG1WeWMyVW9LVHRjYmlBZ2NtVjBkWEp1SUhSb2FYTXVjMnhwWTJVb01Dd2djM1JoY25SSmJtUmxlQ2xjYmlBZ0lDQXVZMjl1WTJGMEtHTnZiblJsYm5Rc1hHNGdJQ0FnSUNCMGFHbHpMbk5zYVdObEtHVnVaRWx1WkdWNEt6RXBYRzRnSUNBZ0tUdGNibjA3WEc0aVhYMD0iLCJ2YXIgbW91c2UgPSB7fSxcbiAgICB3aW5kb3cgPSB7fTtcblxuZnVuY3Rpb24gb25Nb3VzZURvd24oZSl7XG4gIGUucHJldmVudERlZmF1bHQoKTtcbiAgbW91c2UgPSBjb3B5V2l0aChtb3VzZSwge1xuICAgIGJ1dHRvbjogZS5idXR0b24gPT09IDAgPyAnbGVmdCcgOiAncmlnaHQnXG4gIH0pO1xuICByZXR1cm4gZmFsc2U7XG59XG5mdW5jdGlvbiBvbk1vdXNlVXAoZSl7XG4gIGUucHJldmVudERlZmF1bHQoKTtcbiAgbW91c2UgPSBjb3B5V2l0aChtb3VzZSwge1xuICAgIGJ1dHRvbjogdW5kZWZpbmVkXG4gIH0pO1xufVxuZnVuY3Rpb24gb25Nb3VzZU1vdmUoZSl7XG4gIGUucHJldmVudERlZmF1bHQoKTtcbiAgbW91c2UgPSBjb3B5V2l0aChtb3VzZSwge1xuICAgIHg6IGUueCxcbiAgICB5OiBlLnlcbiAgfSk7XG59XG5mdW5jdGlvbiBvblNjcm9sbChlKXtcbiAgbW91c2UgPSBjb3B5V2l0aChtb3VzZSwge1xuICAgIHNjcm9sbFg6IGUuZGVsdGFYLFxuICAgIHNjcm9sbFk6IGUuZGVsdGFZXG4gIH0pXG59XG5mdW5jdGlvbiBvblJlc2l6ZShlKXtcbiAgd2luZG93ID0ge1xuICAgIHdpZHRoOiAgZG9jdW1lbnQuYm9keS5jbGllbnRXaWR0aCxcbiAgICBoZWlnaHQ6IGRvY3VtZW50LmJvZHkuY2xpZW50SGVpZ2h0XG4gIH07XG59XG5kb2N1bWVudC5ib2R5LmFkZEV2ZW50TGlzdGVuZXIoJ21vdXNlbW92ZScsIG9uTW91c2VNb3ZlKTtcbmRvY3VtZW50LmJvZHkuYWRkRXZlbnRMaXN0ZW5lcignbW91c2Vkb3duJywgb25Nb3VzZURvd24pO1xuZG9jdW1lbnQuYm9keS5hZGRFdmVudExpc3RlbmVyKCdtb3VzZXVwJywgICBvbk1vdXNlVXApO1xuYWRkRXZlbnRMaXN0ZW5lcignbW91c2V3aGVlbCcsIG9uU2Nyb2xsKTsgLy9GSVhNRTogc2hvdWxkIHRoaXMgYmUgJ3doZWVsJz9cbmFkZEV2ZW50TGlzdGVuZXIoJ2NvbnRleHRtZW51JywgZnVuY3Rpb24oZSl7IGUucHJldmVudERlZmF1bHQoKTsgfSk7XG5hZGRFdmVudExpc3RlbmVyKCdyZXNpemUnLCBvblJlc2l6ZSk7XG5hZGRFdmVudExpc3RlbmVyKCdtb3VzZWRvd24nLCBmdW5jdGlvbihlKXtcbiAgdGhpcy5mb2N1cygpO1xufSk7XG5cbm9uUmVzaXplKCk7XG5cbm1vZHVsZS5leHBvcnRzLmdldCA9IGZ1bmN0aW9uIGlucHV0R2V0KCl7XG4gIHJldHVybiB7XG4gICAgbW91c2U6IG1vdXNlLFxuICAgIHdpbmRvdzogd2luZG93XG4gIH07XG59O1xuIiwidmFyIFdvcmxkQ29udGFpbmVyID0gcmVxdWlyZSgnLi9vdXRwdXQvd29ybGRfY29udGFpbmVyJyksXG4gICAgVGlsZXNDb250YWluZXIgPSByZXF1aXJlKCcuL291dHB1dC90aWxlc19jb250YWluZXInKSxcbiAgICBTZWxlY3Rpb25Db250YWluZXIgPSByZXF1aXJlKCcuL291dHB1dC9zZWxlY3Rpb25fY29udGFpbmVyJyksXG4gICAgSHVkQ29udGFpbmVyID0gcmVxdWlyZSgnLi9vdXRwdXQvaHVkX2NvbnRhaW5lcicpLFxuICAgIHJlbmRlcmVyLCBzdGFnZSxcbiAgICB3b3JsZENvbnRhaW5lcixcbiAgICAgIHRpbGVzQ29udGFpbmVyLFxuICAgICAgc2VsZWN0aW9uQ29udGFpbmVyLFxuICAgIGh1ZENvbnRhaW5lcjtcblxuZnVuY3Rpb24gT3V0cHV0KCl7XG4gIHJlbmRlcmVyID0gcmVuZGVyZXIgfHwgUElYSS5hdXRvRGV0ZWN0UmVuZGVyZXIoKTtcbiAgZG9jdW1lbnQuYm9keS5hcHBlbmRDaGlsZChyZW5kZXJlci52aWV3KTtcblxuICBzdGFnZSA9IG5ldyBQSVhJLkNvbnRhaW5lcigpO1xuICBzdGFnZS5hZGRDaGlsZCggd29ybGRDb250YWluZXIgPSBuZXcgV29ybGRDb250YWluZXIoKSApO1xuICB3b3JsZENvbnRhaW5lci5hZGRDaGlsZCggdGlsZXNDb250YWluZXIgPSBuZXcgVGlsZXNDb250YWluZXIoKSApO1xuICB3b3JsZENvbnRhaW5lci5hZGRDaGlsZCggc2VsZWN0aW9uQ29udGFpbmVyID0gbmV3IFNlbGVjdGlvbkNvbnRhaW5lcigpICk7XG4gIHN0YWdlLmFkZENoaWxkKCBodWRDb250YWluZXIgPSBuZXcgSHVkQ29udGFpbmVyKCkgKTtcbn07XG5cbk91dHB1dC5wcm90b3R5cGUucmVuZGVyID0gbWVtb2l6ZShmdW5jdGlvbiBvdXRwdXRSZW5kZXIoZ2FtZVN0YXRlKXtcbiAgaHVkQ29udGFpbmVyLnJlbmRlcihnYW1lU3RhdGUpO1xuICB3b3JsZENvbnRhaW5lci5yZW5kZXIoZ2FtZVN0YXRlKTtcbiAgdGlsZXNDb250YWluZXIucmVuZGVyKGdhbWVTdGF0ZSk7XG4gIHNlbGVjdGlvbkNvbnRhaW5lci5yZW5kZXIoZ2FtZVN0YXRlKTtcblxuICByZW5kZXJlci5yZXNpemUoZ2FtZVN0YXRlLndpbmRvd1NpemUud2lkdGgsIGdhbWVTdGF0ZS53aW5kb3dTaXplLmhlaWdodCk7XG4gIHJlbmRlcmVyLnJlbmRlcihzdGFnZSk7XG59KTtcblxubW9kdWxlLmV4cG9ydHMgPSBPdXRwdXQ7XG4iLCJcInVzZSBzdHJpY3RcIjtcbnZhciBOaW5lUGF0Y2ggPSByZXF1aXJlKCcuL25pbmVfcGF0Y2gnKSxcbiAgICBmb3JjZVJlUmVuZGVyID0gcmVxdWlyZSgnLi4vYWN0aW9ucycpLmZvcmNlUmVSZW5kZXI7XG5cbm1vZHVsZS5leHBvcnRzID0gY2xhc3MgQnV0dG9uIGV4dGVuZHMgUElYSS5Db250YWluZXIge1xuICBzdGF0aWMgZ2V0IHRleHR1cmVzKCl7XG4gICAgaWYgKHRoaXMuX3RleHR1cmVzKSByZXR1cm4gdGhpcy5fdGV4dHVyZXM7XG4gICAgdGhpcy5fdGV4dHVyZXMgPSB7XG4gICAgICBkZWZhdWx0OiBQSVhJLlRleHR1cmUuZnJvbUltYWdlKCdyZXNvdXJjZXMvYmx1ZV9idXR0b24wNi5wbmcnKSxcbiAgICAgIGhvdmVyOiAgIFBJWEkuVGV4dHVyZS5mcm9tSW1hZ2UoJ3Jlc291cmNlcy9ibHVlX2J1dHRvbjA5LnBuZycpLFxuICAgICAgYWN0aXZlOiAgUElYSS5UZXh0dXJlLmZyb21JbWFnZSgncmVzb3VyY2VzL2JsdWVfYnV0dG9uMTAucG5nJylcbiAgICB9XG4gICAgcmV0dXJuIHRoaXMuX3RleHR1cmVzO1xuICB9XG5cbiAgY29uc3RydWN0b3IodGV4dCwgYWN0aW9uLCB3aWR0aCwgaGVpZ2h0KXtcbiAgICBzdXBlcigpO1xuICAgIHRoaXMuYWN0aW9uID0gYWN0aW9uO1xuICAgIHRoaXMuc3RhdGUgPSAnZGVmYXVsdCc7XG4gICAgdGhpcy5iZyA9IG5ldyBOaW5lUGF0Y2goQnV0dG9uLnRleHR1cmVzWydkZWZhdWx0J10sIDYsIDYsIDgsIDYpO1xuICAgIHRoaXMuYWRkQ2hpbGQoIHRoaXMuYmcgKTtcbiAgICB0aGlzLnRleHQgPSBuZXcgUElYSS5UZXh0KHRleHQsIHtmb250IDogJzE4cHggQXJpYWwnfSk7XG4gICAgdGhpcy5hZGRDaGlsZCggdGhpcy50ZXh0ICk7XG4gICAgdGhpcy5iZy53aWR0aCAgPSB3aWR0aDtcbiAgICB0aGlzLmJnLmhlaWdodCA9IGhlaWdodDtcbiAgICB0aGlzLnRleHQuYW5jaG9yID0geyB4OiAwLjUsIHk6IDAuNiB9O1xuICAgIHRoaXMudGV4dC5wb3NpdGlvbi54ID0gd2lkdGggLyAyO1xuICAgIHRoaXMudGV4dC5wb3NpdGlvbi55ID0gaGVpZ2h0IC8gMjtcblxuICAgIHRoaXMuaW50ZXJhY3RpdmUgPSB0cnVlO1xuICAgIHRoaXMubW91c2VvdmVyID0gdGhpcy5vbk92ZXI7XG4gICAgdGhpcy5tb3VzZW91dCA9IHRoaXMub25PdXQ7XG4gICAgdGhpcy5tb3VzZWRvd24gPSB0aGlzLm9uRG93bjtcbiAgICB0aGlzLm1vdXNldXAgPSB0aGlzLm9uVXA7XG4gIH1cblxuICB1cGRhdGVTcHJpdGUoKXtcbiAgICB2YXIgc3RhdGUgPSB0aGlzLmlzRG93biA/ICdhY3RpdmUnIDogKCh0aGlzLmZvcmNlSG92ZXIgfHwgdGhpcy5pc092ZXIpID8gJ2hvdmVyJyA6ICdkZWZhdWx0Jyk7XG4gICAgaWYgKHRoaXMuYmcudGV4dHVyZSA9PT0gQnV0dG9uLnRleHR1cmVzW3N0YXRlXSkgcmV0dXJuO1xuICAgIHRoaXMuYmcudGV4dHVyZSA9IEJ1dHRvbi50ZXh0dXJlc1tzdGF0ZV07XG4gICAgZm9yY2VSZVJlbmRlcigpO1xuICB9XG5cbiAgb25PdmVyKGUpe1xuICAgIHRoaXMuaXNPdmVyID0gdHJ1ZTtcbiAgICB0aGlzLnVwZGF0ZVNwcml0ZSgpO1xuICB9XG4gIG9uT3V0KGUpe1xuICAgIHRoaXMuaXNPdmVyID0gZmFsc2U7XG4gICAgdGhpcy5pc0Rvd24gPSBmYWxzZTtcbiAgICB0aGlzLnVwZGF0ZVNwcml0ZSgpO1xuICB9XG4gIG9uRG93bihlKXtcbiAgICB0aGlzLmlzRG93biA9IHRydWU7XG4gICAgdGhpcy5hY3Rpb24oKTtcbiAgICB0aGlzLnVwZGF0ZVNwcml0ZSgpO1xuICB9XG4gIG9uVXAoZSl7XG4gICAgdGhpcy5pc0Rvd24gPSBmYWxzZTtcbiAgICB0aGlzLnVwZGF0ZVNwcml0ZSgpO1xuICB9XG59XG4iLCJcInVzZSBzdHJpY3RcIjtcbnZhciBzZXRUaWxlRWRpdFR5cGUgPSByZXF1aXJlKCcuLi9hY3Rpb25zJykuc2V0VGlsZUVkaXRUeXBlLFxuICAgIEJ1dHRvbiA9IHJlcXVpcmUoJy4vYnV0dG9uJyk7XG5cbmNsYXNzIEh1ZENvbnRhaW5lciBleHRlbmRzIFBJWEkuQ29udGFpbmVyIHtcbiAgc3RhdGljIGdldCB0ZXh0dXJlcygpe1xuICAgIHJldHVybiBbXG4gICAgICBCdXR0b24udGV4dHVyZXMuZGVmYXVsdCxcbiAgICAgIEJ1dHRvbi50ZXh0dXJlcy5ob3ZlcixcbiAgICAgIEJ1dHRvbi50ZXh0dXJlcy5hY3RpdmVcbiAgICBdO1xuICB9XG5cbiAgY29uc3RydWN0b3IoKXtcbiAgICBzdXBlcigpO1xuICAgIHdpbmRvdy5idXR0b24gPSB0aGlzLmJ1bGRvemVCdXR0b24gPSBuZXcgQnV0dG9uKCdCdWxkb3plJywgc2V0VGlsZUVkaXRUeXBlLmJpbmQobnVsbCwgJ2VtcHR5JyksIDE1MCwgNDApO1xuICAgIHRoaXMuYWRkQ2hpbGQodGhpcy5idWxkb3plQnV0dG9uKTtcbiAgICB0aGlzLmJ1aWxkRmxvb3JCdXR0b24gPSBuZXcgQnV0dG9uKCdCdWlsZCBGbG9vcicsIHNldFRpbGVFZGl0VHlwZS5iaW5kKG51bGwsICdmbG9vcicpLCAxNTAsIDQwKTtcbiAgICB0aGlzLmFkZENoaWxkKHRoaXMuYnVpbGRGbG9vckJ1dHRvbik7XG4gIH1cblxuICByZW5kZXIoZ2FtZVN0YXRlKXtcbiAgICB0aGlzLnJlbmRlckh1ZChnYW1lU3RhdGUud2luZG93U2l6ZSwgZ2FtZVN0YXRlLnRpbGVFZGl0VHlwZSk7XG4gIH1cblxuICByZW5kZXJIdWQod2luZG93U2l6ZSwgdGlsZUVkaXRUeXBlKXtcbiAgICB0aGlzLmJ1bGRvemVCdXR0b24ucG9zaXRpb24ueCA9IDU7XG4gICAgdGhpcy5idWxkb3plQnV0dG9uLnBvc2l0aW9uLnkgPSB3aW5kb3dTaXplLmhlaWdodCAtIDQwIC0gNTtcbiAgICB0aGlzLmJ1bGRvemVCdXR0b24uZm9yY2VIb3ZlciA9IHRpbGVFZGl0VHlwZSA9PT0gJ2VtcHR5JztcbiAgICB0aGlzLmJ1bGRvemVCdXR0b24udXBkYXRlU3ByaXRlKCk7XG5cbiAgICB0aGlzLmJ1aWxkRmxvb3JCdXR0b24ucG9zaXRpb24ueCA9IDU7XG4gICAgdGhpcy5idWlsZEZsb29yQnV0dG9uLnBvc2l0aW9uLnkgPSB0aGlzLmJ1bGRvemVCdXR0b24ucG9zaXRpb24ueSAtIDQwIC0gNTtcbiAgICB0aGlzLmJ1aWxkRmxvb3JCdXR0b24uZm9yY2VIb3ZlciA9IHRpbGVFZGl0VHlwZSA9PT0gJ2Zsb29yJztcbiAgICB0aGlzLmJ1aWxkRmxvb3JCdXR0b24udXBkYXRlU3ByaXRlKCk7XG4gIH1cbn1cbkh1ZENvbnRhaW5lci5wcm90b3R5cGUucmVuZGVySHVkID0gbWVtb2l6ZShIdWRDb250YWluZXIucHJvdG90eXBlLnJlbmRlckh1ZCk7XG5cbm1vZHVsZS5leHBvcnRzID0gSHVkQ29udGFpbmVyO1xuIiwiXCJ1c2Ugc3RyaWN0XCI7XG5cbmZ1bmN0aW9uIGNyZWF0ZVBhdGNoKHRleHR1cmUsIHgsIHksIHdpZHRoLCBoZWlnaHQpe1xuICB2YXIgYm9hcmRlclNwcml0ZSA9IG5ldyBQSVhJLlNwcml0ZShuZXcgUElYSS5UZXh0dXJlKHRleHR1cmUsXG4gICAgbmV3IFBJWEkuUmVjdGFuZ2xlKHgsIHksIHdpZHRoLCBoZWlnaHQpXG4gICkpO1xuICBib2FyZGVyU3ByaXRlLnBvc2l0aW9uLnggPSB4O1xuICBib2FyZGVyU3ByaXRlLnBvc2l0aW9uLnkgPSB5O1xuICB0aGlzLmFkZENoaWxkKCBib2FyZGVyU3ByaXRlICk7XG4gIHJldHVybiBib2FyZGVyU3ByaXRlO1xufVxuXG5mdW5jdGlvbiBwb3NpdGlvblBhdGNoKCl7XG4gIGlmICghdGhpcy50b3ApIHJldHVybjtcblxuICB0aGlzLnRvcC5zY2FsZS54ID0gdGhpcy5jZW50ZXIuc2NhbGUueCA9IHRoaXMuYm90dG9tLnNjYWxlLnggPSAxO1xuICB0aGlzLnRvcC53aWR0aCA9IHRoaXMuY2VudGVyLndpZHRoID0gdGhpcy5ib3R0b20ud2lkdGggPSB0aGlzLl93aWR0aCAtIHRoaXMuYm9yZGVyU2l6ZXMubGVmdCAtIHRoaXMuYm9yZGVyU2l6ZXMucmlnaHQ7XG4gIHRoaXMudG9wUmlnaHQucG9zaXRpb24ueCA9IHRoaXMucmlnaHQucG9zaXRpb24ueCA9IHRoaXMuYm90dG9tUmlnaHQucG9zaXRpb24ueCA9IHRoaXMuX3dpZHRoIC0gdGhpcy5ib3JkZXJTaXplcy5yaWdodDtcblxuICB0aGlzLmxlZnQuc2NhbGUueSA9IHRoaXMuY2VudGVyLnNjYWxlLnkgPSB0aGlzLnJpZ2h0LnNjYWxlLnkgPSAxO1xuICB0aGlzLmxlZnQuaGVpZ2h0ID0gdGhpcy5jZW50ZXIuaGVpZ2h0ID0gdGhpcy5yaWdodC5oZWlnaHQgPSB0aGlzLl9oZWlnaHQgLSB0aGlzLmJvcmRlclNpemVzLnRvcCAtIHRoaXMuYm9yZGVyU2l6ZXMuYm90dG9tO1xuICB0aGlzLmNlbnRlci53aWR0aCA9IHRoaXMuX3dpZHRoIC0gdGhpcy5ib3JkZXJTaXplcy5sZWZ0IC0gdGhpcy5ib3JkZXJTaXplcy5yaWdodDtcblxuICB0aGlzLmJvdHRvbUxlZnQucG9zaXRpb24ueSA9IHRoaXMuYm90dG9tLnBvc2l0aW9uLnkgPSB0aGlzLmJvdHRvbVJpZ2h0LnBvc2l0aW9uLnkgPSB0aGlzLl9oZWlnaHQgLSB0aGlzLmJvcmRlclNpemVzLmJvdHRvbTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBjbGFzcyBOaW5lUGF0Y2ggZXh0ZW5kcyBQSVhJLkNvbnRhaW5lciB7XG4gIGNvbnN0cnVjdG9yKHRleHR1cmUsIHRvcCwgcmlnaHQsIGJvdHRvbSwgbGVmdCl7XG4gICAgc3VwZXIoKTtcbiAgICB0aGlzLmJvcmRlclNpemVzID0ge1xuICAgICAgdG9wOiB0b3AsXG4gICAgICByaWdodDogcmlnaHQsXG4gICAgICBib3R0b206IGJvdHRvbSxcbiAgICAgIGxlZnQ6IGxlZnRcbiAgICB9O1xuICAgIHRoaXMudGV4dHVyZSA9IHRleHR1cmU7XG4gIH1cblxuICB1cGRhdGVUZXh0dXJlKHRleHR1cmUpe1xuICAgIGlmICghdGhpcy5fd2lkdGgpIHRoaXMuX3dpZHRoID0gdGV4dHVyZS53aWR0aDtcbiAgICBpZiAoIXRoaXMuX2hlaWdodCkgdGhpcy5faGVpZ2h0ID0gdGV4dHVyZS5oZWlnaHQ7XG5cbiAgICB2YXIgaW5uZXJXaWR0aCA9IHRleHR1cmUud2lkdGggLSB0aGlzLmJvcmRlclNpemVzLmxlZnQgLSB0aGlzLmJvcmRlclNpemVzLnJpZ2h0LFxuICAgICAgICBpbm5lckhlaWdodCA9IHRleHR1cmUuaGVpZ2h0IC0gdGhpcy5ib3JkZXJTaXplcy50b3AgLSB0aGlzLmJvcmRlclNpemVzLmJvdHRvbTtcbiAgICBpZiAoaW5uZXJXaWR0aCA8PSAwIHx8IGlubmVySGVpZ2h0IDw9IDApIHJldHVybjtcblxuICAgIHRoaXMudG9wTGVmdCA9IGNyZWF0ZVBhdGNoLmNhbGwodGhpcywgdGV4dHVyZSxcbiAgICAgIDAsMCwgdGhpcy5ib3JkZXJTaXplcy5sZWZ0LCB0aGlzLmJvcmRlclNpemVzLnRvcCk7XG4gICAgdGhpcy50b3AgPSBjcmVhdGVQYXRjaC5jYWxsKHRoaXMsIHRleHR1cmUsXG4gICAgICB0aGlzLmJvcmRlclNpemVzLmxlZnQsIDAsIGlubmVyV2lkdGgsIHRoaXMuYm9yZGVyU2l6ZXMudG9wKTtcbiAgICB0aGlzLnRvcFJpZ2h0ID0gY3JlYXRlUGF0Y2guY2FsbCh0aGlzLCB0ZXh0dXJlLFxuICAgICAgdGV4dHVyZS53aWR0aC10aGlzLmJvcmRlclNpemVzLnJpZ2h0LCAwLCB0aGlzLmJvcmRlclNpemVzLnJpZ2h0LCB0aGlzLmJvcmRlclNpemVzLnRvcCk7XG5cbiAgICB0aGlzLmxlZnQgPSBjcmVhdGVQYXRjaC5jYWxsKHRoaXMsIHRleHR1cmUsXG4gICAgICAwLCB0aGlzLmJvcmRlclNpemVzLnRvcCwgdGhpcy5ib3JkZXJTaXplcy5sZWZ0LCBpbm5lckhlaWdodCk7XG4gICAgdGhpcy5jZW50ZXIgPSBjcmVhdGVQYXRjaC5jYWxsKHRoaXMsIHRleHR1cmUsXG4gICAgICB0aGlzLmJvcmRlclNpemVzLmxlZnQsIHRoaXMuYm9yZGVyU2l6ZXMudG9wLCBpbm5lcldpZHRoLCBpbm5lckhlaWdodCk7XG4gICAgdGhpcy5yaWdodCA9IGNyZWF0ZVBhdGNoLmNhbGwodGhpcywgdGV4dHVyZSxcbiAgICAgIHRleHR1cmUud2lkdGgtdGhpcy5ib3JkZXJTaXplcy5yaWdodCwgdGhpcy5ib3JkZXJTaXplcy50b3AsIHRoaXMuYm9yZGVyU2l6ZXMucmlnaHQsIGlubmVySGVpZ2h0KTtcblxuICAgIHRoaXMuYm90dG9tTGVmdCA9IGNyZWF0ZVBhdGNoLmNhbGwodGhpcywgdGV4dHVyZSxcbiAgICAgIDAsIHRleHR1cmUuaGVpZ2h0LXRoaXMuYm9yZGVyU2l6ZXMuYm90dG9tLCB0aGlzLmJvcmRlclNpemVzLmxlZnQsIHRoaXMuYm9yZGVyU2l6ZXMuYm90dG9tKTtcbiAgICB0aGlzLmJvdHRvbSA9IGNyZWF0ZVBhdGNoLmNhbGwodGhpcywgdGV4dHVyZSxcbiAgICAgIHRoaXMuYm9yZGVyU2l6ZXMubGVmdCwgdGV4dHVyZS5oZWlnaHQtdGhpcy5ib3JkZXJTaXplcy5ib3R0b20sIGlubmVyV2lkdGgsIHRoaXMuYm9yZGVyU2l6ZXMuYm90dG9tKTtcbiAgICB0aGlzLmJvdHRvbVJpZ2h0ID0gY3JlYXRlUGF0Y2guY2FsbCh0aGlzLCB0ZXh0dXJlLFxuICAgICAgdGV4dHVyZS53aWR0aC10aGlzLmJvcmRlclNpemVzLnJpZ2h0LCB0ZXh0dXJlLmhlaWdodC10aGlzLmJvcmRlclNpemVzLmJvdHRvbSwgdGhpcy5ib3JkZXJTaXplcy5yaWdodCwgdGhpcy5ib3JkZXJTaXplcy5ib3R0b20pO1xuXG4gICAgcG9zaXRpb25QYXRjaC5jYWxsKHRoaXMpO1xuICB9XG5cbiAgZ2V0IHRleHR1cmUoKXtcbiAgICByZXR1cm4gdGhpcy5fdGV4dHVyZTtcbiAgfVxuICBzZXQgdGV4dHVyZSh0ZXh0dXJlKXtcbiAgICB0aGlzLl90ZXh0dXJlID0gdGV4dHVyZTtcbiAgICB0aGlzLnVwZGF0ZVRleHR1cmUodGV4dHVyZSk7XG4gICAgdGV4dHVyZS5vbmNlKCd1cGRhdGUnLCB0aGlzLnVwZGF0ZVRleHR1cmUuYmluZCh0aGlzKSk7XG4gIH1cblxuICBnZXQgd2lkdGgoKXtcbiAgICByZXR1cm4gdGhpcy5fd2lkdGg7XG4gIH1cbiAgc2V0IHdpZHRoKHdpZHRoKXtcbiAgICB0aGlzLl93aWR0aCA9IHdpZHRoO1xuICAgIHBvc2l0aW9uUGF0Y2guY2FsbCh0aGlzKTtcbiAgfVxuXG4gIGdldCBoZWlnaHQoKXtcbiAgICByZXR1cm4gdGhpcy5faGVpZ2h0O1xuICB9XG4gIHNldCBoZWlnaHQoaGVpZ2h0KXtcbiAgICB0aGlzLl9oZWlnaHQgPSBoZWlnaHQ7XG4gICAgcG9zaXRpb25QYXRjaC5jYWxsKHRoaXMpO1xuICB9XG59O1xuIiwiXCJ1c2Ugc3RyaWN0XCI7XG5cbmNsYXNzIFNlbGVjdGlvbkNvbnRhaW5lciBleHRlbmRzIFBJWEkuQ29udGFpbmVyIHtcbiAgc3RhdGljIGdldCB0ZXh0dXJlcygpe1xuICAgIHJldHVybiBbXG4gICAgICBTZWxlY3Rpb25HcmFwaGljLnRleHR1cmVcbiAgICBdO1xuICB9XG5cbiAgY29uc3RydWN0b3IoKXtcbiAgICBzdXBlcigpXG4gICAgdGhpcy5zZWxlY3Rpb25NYXAgPSB7fTtcbiAgfVxuICByZW5kZXIoZ2FtZVN0YXRlKXtcbiAgICBpZiAoIWdhbWVTdGF0ZS53b3JsZC5zZWxlY3Rpb24pIHtcbiAgICAgIGlmIChPYmplY3Qua2V5cyh0aGlzLnNlbGVjdGlvbk1hcCkubGVuZ3RoKXtcbiAgICAgICAgdGhpcy5yZW1vdmVDaGlsZHJlbigpO1xuICAgICAgICB0aGlzLnNlbGVjdGlvbk1hcCA9IHt9O1xuICAgICAgfVxuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBsZXQgc2NhbGUgPSBnYW1lU3RhdGUud29ybGQuc2NhbGUsXG4gICAgICAgIGNlbnRlciA9IGdhbWVTdGF0ZS53b3JsZC5jZW50ZXIsXG4gICAgICAgIGhlaWdodCA9IGdhbWVTdGF0ZS53aW5kb3dTaXplLmhlaWdodCAvIHNjYWxlLFxuICAgICAgICB3aWR0aCAgPSBnYW1lU3RhdGUud2luZG93U2l6ZS53aWR0aCAgLyBzY2FsZSxcbiAgICAgICAgc2VsZWN0aW9uID0gZ2FtZVN0YXRlLndvcmxkLnNlbGVjdGlvbixcbiAgICAgICAgbWluWCA9IE1hdGgubWluKHNlbGVjdGlvbi5zdGFydC54LCBzZWxlY3Rpb24uZW5kLngpLFxuICAgICAgICBtYXhYID0gTWF0aC5tYXgoc2VsZWN0aW9uLnN0YXJ0LngsIHNlbGVjdGlvbi5lbmQueCksXG4gICAgICAgIG1pblkgPSBNYXRoLm1pbihzZWxlY3Rpb24uc3RhcnQueSwgc2VsZWN0aW9uLmVuZC55KSxcbiAgICAgICAgbWF4WSA9IE1hdGgubWF4KHNlbGVjdGlvbi5zdGFydC55LCBzZWxlY3Rpb24uZW5kLnkpO1xuXG4gICAgdGhpcy5yZW5kZXJTZWxlY3Rpb24oZ2FtZVN0YXRlLndvcmxkLnNlbGVjdGlvbiwgbWluWSwgbWF4WSwgbWluWCwgbWF4WCwgc2NhbGUpO1xuICB9XG4gIHJlbmRlclNlbGVjdGlvbihzZWxlY3Rpb24sIG1pblksIG1heFksIG1pblgsIG1heFgsIHNjYWxlKXtcblxuICAgIGZvciAobGV0IHkgaW4gdGhpcy5zZWxlY3Rpb25NYXApe1xuICAgICAgZm9yIChsZXQgeCBpbiB0aGlzLnNlbGVjdGlvbk1hcFt5XSl7XG4gICAgICAgIGlmICh4PG1pblggfHwgeD5tYXhYIHx8IHk8bWluWSB8fCB5Pm1heFkpe1xuICAgICAgICAgIHRoaXMucmVtb3ZlQ2hpbGQodGhpcy5zZWxlY3Rpb25NYXBbeV1beF0pO1xuICAgICAgICAgIGRlbGV0ZSB0aGlzLnNlbGVjdGlvbk1hcFt5XVt4XTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgaWYgKHk8bWluWSB8fCB5Pm1heFkpe1xuICAgICAgICBkZWxldGUgdGhpcy5zZWxlY3Rpb25NYXBbeV07XG4gICAgICB9XG4gICAgfVxuICAgIGZvciAobGV0IHk9bWluWTsgeTw9bWF4WTsgeSsrKXtcbiAgICAgIGlmICghdGhpcy5zZWxlY3Rpb25NYXBbeV0pIHRoaXMuc2VsZWN0aW9uTWFwW3ldID0ge307XG4gICAgICBmb3IgKGxldCB4PW1pblg7IHg8PW1heFg7IHgrKyl7XG4gICAgICAgIGlmICghdGhpcy5zZWxlY3Rpb25NYXBbeV1beF0pIHtcbiAgICAgICAgICB0aGlzLnNlbGVjdGlvbk1hcFt5XVt4XSA9IG5ldyBTZWxlY3Rpb25HcmFwaGljKHgseSwgc2NhbGUpO1xuICAgICAgICAgIHRoaXMuYWRkQ2hpbGQoIHRoaXMuc2VsZWN0aW9uTWFwW3ldW3hdICk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH1cbn1cblNlbGVjdGlvbkNvbnRhaW5lci5wcm90b3R5cGUucmVuZGVyU2VsZWN0aW9uID0gbWVtb2l6ZShTZWxlY3Rpb25Db250YWluZXIucHJvdG90eXBlLnJlbmRlclNlbGVjdGlvbik7XG5cbmNsYXNzIFNlbGVjdGlvbkdyYXBoaWMgZXh0ZW5kcyBQSVhJLlNwcml0ZSB7XG4gIHN0YXRpYyBnZXQgdGV4dHVyZSgpe1xuICAgIGlmICh0aGlzLl90ZXh0dXJlKSByZXR1cm4gdGhpcy5fdGV4dHVyZTtcbiAgICB0aGlzLl90ZXh0dXJlID0gUElYSS5UZXh0dXJlLmZyb21JbWFnZSgncmVzb3VyY2VzL0N1cnNvckNpcmNsZS5wbmcnKTtcbiAgICByZXR1cm4gdGhpcy5fdGV4dHVyZTtcbiAgfVxuXG4gIGNvbnN0cnVjdG9yKHgseSxzY2FsZSl7XG4gICAgc3VwZXIoU2VsZWN0aW9uR3JhcGhpYy50ZXh0dXJlKTtcbiAgICB0aGlzLnBvc2l0aW9uLnggPSB4KnNjYWxlO1xuICAgIHRoaXMucG9zaXRpb24ueSA9IHkqc2NhbGU7XG4gICAgdGhpcy5oZWlnaHQgPSB0aGlzLndpZHRoID0gc2NhbGU7XG4gIH1cbn1cblxubW9kdWxlLmV4cG9ydHMgPSBTZWxlY3Rpb25Db250YWluZXI7XG4iLCJcInVzZSBzdHJpY3RcIjtcblxudmFyIGFjdGlvbnMgPSByZXF1aXJlKCcuLi9hY3Rpb25zJyksXG4gICAgc3RhcnRUaWxlU2VsZWN0aW9uID0gYWN0aW9ucy5zdGFydFRpbGVTZWxlY3Rpb24sXG4gICAgY29udGludWVUaWxlU2VsZWN0aW9uID0gYWN0aW9ucy5jb250aW51ZVRpbGVTZWxlY3Rpb24sXG4gICAgZW5kVGlsZVNlbGVjdGlvbiA9IGFjdGlvbnMuZW5kVGlsZVNlbGVjdGlvbjtcblxuZnVuY3Rpb24gcG9pbnRGcm9tRXZlbnQoZSl7XG4gIHZhciB4ID0gTWF0aC5mbG9vcigoZS5kYXRhLmdsb2JhbC54IC0gdGhpcy5wYXJlbnQucG9zaXRpb24ueCkgLyB0aGlzLndvcmxkU2NhbGUpLFxuICAgICAgeSA9IE1hdGguZmxvb3IoKGUuZGF0YS5nbG9iYWwueSAtIHRoaXMucGFyZW50LnBvc2l0aW9uLnkpIC8gdGhpcy53b3JsZFNjYWxlKTtcbiAgcmV0dXJuIHsgeCwgeSB9O1xufVxuXG5jbGFzcyBUaWxlc0NvbnRhaW5lciBleHRlbmRzIFBJWEkuQ29udGFpbmVyIHtcbiAgc3RhdGljIGdldCB0ZXh0dXJlcygpe1xuICAgIHJldHVybiBbXG4gICAgICBGbG9vckdyYXBoaWMudGV4dHVyZVxuICAgIF07XG4gIH1cblxuICBjb25zdHJ1Y3Rvcigpe1xuICAgIHN1cGVyKCk7XG4gICAgdGhpcy50aWxlTWFwID0ge307XG5cbiAgICB0aGlzLmludGVyYWN0aXZlID0gdHJ1ZTtcbiAgfVxuICByZW5kZXIoZ2FtZVN0YXRlKXtcbiAgICBsZXQgc2NhbGUgPSBnYW1lU3RhdGUud29ybGQuc2NhbGUsXG4gICAgICAgIHNpemUgPSBnYW1lU3RhdGUud29ybGQuc2l6ZSxcbiAgICAgICAgY2VudGVyID0gZ2FtZVN0YXRlLndvcmxkLmNlbnRlcixcbiAgICAgICAgaGVpZ2h0ID0gZ2FtZVN0YXRlLndpbmRvd1NpemUuaGVpZ2h0IC8gc2NhbGUsXG4gICAgICAgIHdpZHRoICA9IGdhbWVTdGF0ZS53aW5kb3dTaXplLndpZHRoICAvIHNjYWxlLFxuICAgICAgICBtaW5ZID0gTWF0aC5tYXgoMCwgICAgTWF0aC5mbG9vcihjZW50ZXIueS1oZWlnaHQvMikpLFxuICAgICAgICBtYXhZID0gTWF0aC5taW4oc2l6ZSwgTWF0aC5jZWlsKCBjZW50ZXIueStoZWlnaHQvMikpLFxuICAgICAgICBtaW5YID0gTWF0aC5tYXgoMCwgICAgTWF0aC5mbG9vcihjZW50ZXIueC13aWR0aCAvMikpLFxuICAgICAgICBtYXhYID0gTWF0aC5taW4oc2l6ZSwgTWF0aC5jZWlsKCBjZW50ZXIueCt3aWR0aCAvMikpO1xuXG4gICAgdGhpcy53b3JsZFNjYWxlID0gc2NhbGU7XG5cbiAgICB0aGlzLnJlbmRlck1hcChnYW1lU3RhdGUud29ybGQudGlsZXMsIG1pblksIG1heFksIG1pblgsIG1heFgsIHNjYWxlKTtcbiAgfVxuICByZW5kZXJNYXAodGlsZXMsIG1pblksIG1heFksIG1pblgsIG1heFgsIHNjYWxlKXtcbiAgICB0aGlzLmhpdEFyZWEgPSBuZXcgUElYSS5SZWN0YW5nbGUoMCwwLCAxMDAqc2NhbGUsMTAwKnNjYWxlKTtcblxuICAgIGZvciAobGV0IHkgaW4gdGhpcy50aWxlTWFwKXtcbiAgICAgIGZvciAobGV0IHggaW4gdGhpcy50aWxlTWFwW3ldKXtcbiAgICAgICAgaWYgKHRoaXMudGlsZU1hcFt5XVt4XSAhPT0gdGlsZXNbeV1beF0gfHwgeDxtaW5YIHx8IHg+bWF4WCB8fCB5PG1pblkgfHwgeT5tYXhZKXtcbiAgICAgICAgICB0aGlzLnJlbW92ZUNoaWxkKHRoaXMudGlsZU1hcFt5XVt4XSk7XG4gICAgICAgICAgZGVsZXRlIHRoaXMudGlsZU1hcFt5XVt4XTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgaWYgKHk8bWluWSB8fCB5Pm1heFkpe1xuICAgICAgICBkZWxldGUgdGhpcy50aWxlTWFwW3ldO1xuICAgICAgfVxuICAgIH1cbiAgICBmb3IgKGxldCB5PW1pblk7IHk8bWF4WTsgeSsrKXtcbiAgICAgIGlmICghdGhpcy50aWxlTWFwW3ldKSB0aGlzLnRpbGVNYXBbeV0gPSB7fTtcbiAgICAgIGZvciAobGV0IHg9bWluWDsgeDxtYXhYOyB4Kyspe1xuICAgICAgICBpZiAoIXRoaXMudGlsZU1hcFt5XVt4XSkge1xuICAgICAgICAgIHRoaXMudGlsZU1hcFt5XVt4XSA9IHRoaXMuZ2V0VGlsZSh0aWxlcywgeCx5LCBzY2FsZSk7XG4gICAgICAgICAgdGhpcy5hZGRDaGlsZCggdGhpcy50aWxlTWFwW3ldW3hdICk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH1cbiAgZ2V0VGlsZSh0aWxlcywgeCwgeSwgc2NhbGUpe1xuICAgIGNvbnN0IHRpbGUgPSB0aWxlc1t5XVt4XTtcbiAgICBpZiAodGlsZS50eXBlID09PSAnZW1wdHknKSB7XG4gICAgICByZXR1cm4gbmV3IFBJWEkuQ29udGFpbmVyKCk7XG4gICAgfSBlbHNlIGlmICh0aWxlLnR5cGUgPT09ICdmbG9vcicpIHtcbiAgICAgIHJldHVybiBuZXcgRmxvb3JHcmFwaGljKHgseSwgc2NhbGUpO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXCJUaWxlc0NvbnRhaW5lciNnZXRUaWxlOiBVbmtub3duIHRpbGUgdHlwZTogXCIrdGlsZS50eXBlKTtcbiAgICB9XG4gIH1cbiAgbW91c2Vkb3duKGUpe1xuICAgIHZhciBwb2ludCA9IHBvaW50RnJvbUV2ZW50LmNhbGwodGhpcywgZSk7XG4gICAgc3RhcnRUaWxlU2VsZWN0aW9uKHBvaW50KTtcbiAgICB0aGlzLmlzU2VsZWN0aW5nID0gdHJ1ZTtcbiAgfVxuICBtb3VzZW1vdmUoZSl7XG4gICAgaWYgKCF0aGlzLmlzU2VsZWN0aW5nKSByZXR1cm47XG4gICAgdmFyIHBvaW50ID0gcG9pbnRGcm9tRXZlbnQuY2FsbCh0aGlzLCBlKTtcbiAgICBjb250aW51ZVRpbGVTZWxlY3Rpb24ocG9pbnQpO1xuICB9XG4gIG1vdXNldXAoZSl7XG4gICAgdmFyIHBvaW50ID0gcG9pbnRGcm9tRXZlbnQuY2FsbCh0aGlzLCBlKTtcbiAgICBlbmRUaWxlU2VsZWN0aW9uKHBvaW50KTtcbiAgICB0aGlzLmlzU2VsZWN0aW5nID0gZmFsc2U7XG4gIH1cbiAgLy8gbW91c2VvdXQoZSl7XG4gIC8vIH1cbn1cblRpbGVzQ29udGFpbmVyLnByb3RvdHlwZS5yZW5kZXJNYXAgPSBtZW1vaXplKFRpbGVzQ29udGFpbmVyLnByb3RvdHlwZS5yZW5kZXJNYXApO1xuXG5jbGFzcyBGbG9vckdyYXBoaWMgZXh0ZW5kcyBQSVhJLlNwcml0ZSB7XG4gIHN0YXRpYyBnZXQgdGV4dHVyZSgpe1xuICAgIGlmICh0aGlzLl90ZXh0dXJlKSByZXR1cm4gdGhpcy5fdGV4dHVyZTtcbiAgICB0aGlzLl90ZXh0dXJlID0gUElYSS5UZXh0dXJlLmZyb21JbWFnZSgncmVzb3VyY2VzL0Zsb29yLnBuZycpO1xuICAgIHJldHVybiB0aGlzLl90ZXh0dXJlO1xuICB9XG5cbiAgY29uc3RydWN0b3IoeCx5LHNjYWxlKXtcbiAgICBzdXBlcihGbG9vckdyYXBoaWMudGV4dHVyZSk7XG4gICAgdGhpcy5wb3NpdGlvbi54ID0geCpzY2FsZTtcbiAgICB0aGlzLnBvc2l0aW9uLnkgPSB5KnNjYWxlO1xuICAgIHRoaXMuaGVpZ2h0ID0gdGhpcy53aWR0aCA9IHNjYWxlO1xuICB9XG59XG5cbm1vZHVsZS5leHBvcnRzID0gVGlsZXNDb250YWluZXI7XG4iLCJcInVzZSBzdHJpY3RcIjtcblxuY2xhc3MgV29ybGRDb250YWluZXIgZXh0ZW5kcyBQSVhJLkNvbnRhaW5lciB7XG4gIHJlbmRlcihnYW1lU3RhdGUpe1xuICAgIHRoaXMucmVuZGVyV29ybGQoZ2FtZVN0YXRlLndvcmxkLmNlbnRlciwgZ2FtZVN0YXRlLndpbmRvd1NpemUsIGdhbWVTdGF0ZS53b3JsZC5zY2FsZSk7XG4gIH1cbiAgcmVuZGVyV29ybGQoY2VudGVyLCB3aW5kb3dTaXplLCBzY2FsZSl7XG4gICAgdGhpcy5wb3NpdGlvbi54ID0gd2luZG93U2l6ZS53aWR0aCAgLyAyIC0gY2VudGVyLnggKiBzY2FsZTtcbiAgICB0aGlzLnBvc2l0aW9uLnkgPSB3aW5kb3dTaXplLmhlaWdodCAvIDIgLSBjZW50ZXIueSAqIHNjYWxlO1xuICB9XG59XG5Xb3JsZENvbnRhaW5lci5wcm90b3R5cGUucmVuZGVyV29ybGQgPSBtZW1vaXplKFdvcmxkQ29udGFpbmVyLnByb3RvdHlwZS5yZW5kZXJXb3JsZCk7XG5cbm1vZHVsZS5leHBvcnRzID0gV29ybGRDb250YWluZXI7XG4iLCJ2YXIgY2FsbGJhY2ssIGxhc3RUaW1lO1xuXG5mdW5jdGlvbiBvblRpY2sodGltZSl7XG4gIHJlcXVlc3RBbmltYXRpb25GcmFtZShvblRpY2spO1xuICBpZiAoIXdpbmRvdy5wYXVzZSkgY2FsbGJhY2sodGltZSAtIGxhc3RUaW1lKTtcbiAgbGFzdFRpbWUgPSB0aW1lO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIGluaXRUaWNrKGNiKXtcbiAgaWYgKGNhbGxiYWNrKSB0aHJvdyBcInRpY2sgY2FsbGVkIG1vcmUgdGhhbiBvbmNlIVwiXG4gIHJlcXVlc3RBbmltYXRpb25GcmFtZShvblRpY2spO1xuICBjYWxsYmFjayA9IGNiO1xuICBsYXN0VGltZSA9IHBlcmZvcm1hbmNlLm5vdygpO1xufTtcbiIsInZhciBjaGFuZ2VTdGF0ZSA9IHJlcXVpcmUoJy4vdXBkYXRlL2NoYW5nZV9zdGF0ZScpLFxuICAgIHJlc2l6ZVdpbmRvdyA9IHJlcXVpcmUoJy4vdXBkYXRlL3Jlc2l6ZV93aW5kb3cnKSxcbiAgICBsb2FkVGV4dHVyZXMgPSByZXF1aXJlKCcuL3VwZGF0ZS9sb2FkX3RleHR1cmVzJyksXG4gICAgbW92ZVNjcmVlbiA9IHJlcXVpcmUoJy4vdXBkYXRlL21vdmVfc2NyZWVuJyk7XG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gdXBkYXRlKHRpbWVEZWx0YSwgaW5wdXQsIGdhbWVTdGF0ZSl7XG4gIHJldHVybiBbXG4gICAgY2hhbmdlU3RhdGUuYmluZChudWxsLCBpbnB1dCksXG4gICAgbG9hZFRleHR1cmVzLFxuICAgIHJlc2l6ZVdpbmRvdy5iaW5kKG51bGwsIGlucHV0KSxcbiAgICBtb3ZlU2NyZWVuLmJpbmQobnVsbCwgaW5wdXQpLFxuICBdLnJlZHVjZShmdW5jdGlvbiB1cGRhdGVSZWR1Y2VDaGFuZ2VzKGdhbWVTdGF0ZSwgZil7IHJldHVybiBmKGdhbWVTdGF0ZSkgfHwgZ2FtZVN0YXRlOyB9LCBnYW1lU3RhdGUpO1xufTtcbiIsIi8qXG4gKiB1bmRlZmluZWQgLS1zdGFydC0tPiAncGxheWluZydcbiAqL1xuXG5mdW5jdGlvbiBzdGFydChnYW1lU3RhdGUpe1xuICB2YXIgbmV3R2FtZVN0YXRlID0gY29weVdpdGgoZ2FtZVN0YXRlLCB7XG4gICAgc3RhdGU6ICdwbGF5aW5nJyxcbiAgICB3b3JsZDoge1xuICAgICAgc2l6ZTogMTAwLFxuICAgICAgdGlsZXM6IFtdXG4gICAgfVxuICB9KTtcblxuICBmb3IgKHZhciB5PTA7eTxuZXdHYW1lU3RhdGUud29ybGQuc2l6ZTt5Kyspe1xuICAgIHZhciByb3cgPSBbXTtcbiAgICBuZXdHYW1lU3RhdGUud29ybGQudGlsZXMucHVzaChyb3cpO1xuICAgIGZvciAodmFyIHg9MDt4PG5ld0dhbWVTdGF0ZS53b3JsZC5zaXplO3grKyl7XG4gICAgICByb3cucHVzaCh7XG4gICAgICAgIHR5cGU6IE1hdGgucmFuZG9tKCkgPiAwLjUgPyAnZW1wdHknIDogJ2Zsb29yJyxcbiAgICAgICAgLy8gbG9vc2VPYmplY3Q6IG51bGwsXG4gICAgICAgIC8vIGluc3RhbGxlZE9iamVjdDogbnVsbCxcbiAgICAgICAgLy8geDogeCxcbiAgICAgICAgLy8geTogeVxuICAgICAgfSk7XG4gICAgfVxuICB9XG4gIHJldHVybiBuZXdHYW1lU3RhdGU7XG59XG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gY2hhbmdlU3RhdGUoaW5wdXQsIGdhbWVTdGF0ZSl7XG4gIHN3aXRjaChnYW1lU3RhdGUuc3RhdGUpe1xuXG4gICAgY2FzZSB1bmRlZmluZWQ6XG4gICAgICByZXR1cm4gc3RhcnQoZ2FtZVN0YXRlKTtcblxuICAgIGNhc2UgJ3BsYXlpbmcnOlxuICAgICAgYnJlYWs7XG5cbiAgICBkZWZhdWx0OlxuICAgICAgY29uc29sZS5lcnJvcigndW5rbm93biBnYW1lU3RhdGUnLCBnYW1lU3RhdGUuc3RhdGUpO1xuICAgICAgcmV0dXJuIGNvcHlXaXRoKGdhbWVTdGF0ZSwge1xuICAgICAgICBzdGF0ZTogdW5kZWZpbmVkXG4gICAgICB9KTtcbiAgfVxufTtcbiIsInZhciBUaWxlc0NvbnRhaW5lciA9IHJlcXVpcmUoJy4uL291dHB1dC90aWxlc19jb250YWluZXInKSxcbiAgICBjb250YWluZXJUZXh0dXJlc1RvTG9hZCA9IFtcbiAgICAgIFRpbGVzQ29udGFpbmVyLnRleHR1cmVzXG4gICAgXSxcbiAgICB0ZXh0dXJlc1RvTG9hZCA9IEFycmF5LnByb3RvdHlwZS5jb25jYXQuYXBwbHkoW10sIGNvbnRhaW5lclRleHR1cmVzVG9Mb2FkKSxcbiAgICBsb2FkZWRUZXh0dXJlQ291bnQgPSAwO1xuXG50ZXh0dXJlc1RvTG9hZC5mb3JFYWNoKGZ1bmN0aW9uKHRleHR1cmUpe1xuICB0ZXh0dXJlLm9uY2UoJ3VwZGF0ZScsIGZ1bmN0aW9uKCl7XG4gICAgbG9hZGVkVGV4dHVyZUNvdW50ICs9IDE7XG4gIH0pO1xufSk7XG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gbG9hZFRleHR1cmVzKGdhbWVTdGF0ZSl7XG4gIGlmIChnYW1lU3RhdGUubG9hZGVkVGV4dHVyZUNvdW50ID09PSBsb2FkZWRUZXh0dXJlQ291bnQpIHJldHVybjtcblxuICByZXR1cm4gY29weVdpdGgoZ2FtZVN0YXRlLCB7XG4gICAgbG9hZGVkVGV4dHVyZUNvdW50OiBsb2FkZWRUZXh0dXJlQ291bnRcbiAgfSk7XG59O1xuIiwidmFyIHBhblN0YXJ0O1xuXG52YXIgbWVtb2l6ZWRNb3ZlU2NyZWVuID0gbWVtb2l6ZShmdW5jdGlvbihtb3VzZSwgZ2FtZVN0YXRlKXtcbiAgaWYgKCFnYW1lU3RhdGUud29ybGQgfHwgIWdhbWVTdGF0ZS53b3JsZC5jZW50ZXIpe1xuICAgIGdhbWVTdGF0ZSA9IGNvcHlXaXRoKGdhbWVTdGF0ZSwge1xuICAgICAgd29ybGQ6IHtcbiAgICAgICAgc2NhbGU6IDMyLFxuICAgICAgICBjZW50ZXI6IHsgeDogMCwgeTogMCB9XG4gICAgICB9XG4gICAgfSk7XG4gIH1cblxuICBpZiAobW91c2Uuc2Nyb2xsWSl7XG4gICAgdmFyIHNjYWxlID0gZ2FtZVN0YXRlLndvcmxkLnNjYWxlLFxuICAgICAgICBuZXdTY2FsZSA9IE1hdGgubWluKDEwMCwgTWF0aC5tYXgoMjAsXG4gICAgICAgICAgc2NhbGUgLSBtb3VzZS5zY3JvbGxZIC8gc2NhbGVcbiAgICAgICAgKSk7XG4gICAgaWYgKG5ld1NjYWxlICE9PSBzY2FsZSkge1xuICAgICAgZ2FtZVN0YXRlID0gY29weVdpdGgoZ2FtZVN0YXRlLCB7XG4gICAgICAgIHdvcmxkOiB7XG4gICAgICAgICAgc2NhbGU6IG5ld1NjYWxlXG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH1cbiAgfVxuXG4gIGlmIChtb3VzZS5idXR0b24gPT09ICdyaWdodCcpe1xuICAgIGlmICghcGFuU3RhcnQpe1xuICAgICAgcGFuU3RhcnQgPSB7XG4gICAgICAgIG1vdXNlLFxuICAgICAgICBjZW50ZXI6IGdhbWVTdGF0ZS53b3JsZC5jZW50ZXJcbiAgICAgIH07XG4gICAgfSBlbHNlIHtcbiAgICAgIGNvbnN0IGNlbnRlclggPSAocGFuU3RhcnQubW91c2UueCAtIG1vdXNlLngpIC8gZ2FtZVN0YXRlLndvcmxkLnNjYWxlICsgcGFuU3RhcnQuY2VudGVyLngsXG4gICAgICAgICAgICBjZW50ZXJZID0gKHBhblN0YXJ0Lm1vdXNlLnkgLSBtb3VzZS55KSAvIGdhbWVTdGF0ZS53b3JsZC5zY2FsZSArIHBhblN0YXJ0LmNlbnRlci55O1xuICAgICAgaWYgKFxuICAgICAgICBjZW50ZXJYICE9PSBnYW1lU3RhdGUud29ybGQuY2VudGVyLnggfHxcbiAgICAgICAgY2VudGVyWSAhPT0gZ2FtZVN0YXRlLndvcmxkLmNlbnRlci55XG4gICAgICApe1xuICAgICAgICBnYW1lU3RhdGUgPSBjb3B5V2l0aChnYW1lU3RhdGUsIHtcbiAgICAgICAgICB3b3JsZDogeyBjZW50ZXI6IHtcbiAgICAgICAgICAgIHg6IGNlbnRlclgsXG4gICAgICAgICAgICB5OiBjZW50ZXJZXG4gICAgICAgICAgfX1cbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgfVxuICB9IGVsc2UgaWYgKHBhblN0YXJ0KXtcbiAgICBwYW5TdGFydCA9IG51bGw7XG4gIH1cblxuICByZXR1cm4gZ2FtZVN0YXRlO1xufSk7XG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gbW92ZVNjcmVlbihpbnB1dCwgZ2FtZVN0YXRlKXtcbiAgcmV0dXJuIG1lbW9pemVkTW92ZVNjcmVlbihpbnB1dC5tb3VzZSwgZ2FtZVN0YXRlKTtcbn07XG4iLCJ2YXIgb2xkV2luZG93O1xuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIHJlc2l6ZVdpbmRvdyhpbnB1dCwgZ2FtZVN0YXRlKXtcbiAgaWYgKGlucHV0LndpbmRvdyA9PT0gb2xkV2luZG93KSByZXR1cm47XG4gIG9sZFdpbmRvdyA9IGlucHV0LndpbmRvdztcblxuICByZXR1cm4gY29weVdpdGgoZ2FtZVN0YXRlLCB7XG4gICAgd2luZG93U2l6ZTogaW5wdXQud2luZG93XG4gIH0pO1xufTtcbiJdfQ==
