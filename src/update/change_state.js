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
        looseObject: null,
        installedObject: null,
        x: x,
        y: y
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
