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
