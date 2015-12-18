var flushActions = require('../actions').flush;

function setTileEditType(gameState, action){
  if (action.tileType === gameState.tileEditType) return gameState;

  return copyWith(gameState, {
    tileEditType: action.tileType
  });
}

function processAction(gameState, action){
  switch (action.type) {
    case 'setTileEditType': return setTileEditType(gameState, action);
    default: throw new Error("processAction: Unknown action type: "+action.type);
  }
}

module.exports = function processActions(gameState){
  return flushActions().reduce(processAction, gameState);
};
