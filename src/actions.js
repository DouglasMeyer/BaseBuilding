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
