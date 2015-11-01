/*
 * undefined --start--> 'playing'
 */
module.exports = function changeState(input, gameState){
  switch(gameState.state){

    case undefined:
      // start
      return copyWith(gameState, {
        state: 'playing'
      });

    case 'playing':
      break;

    default:
      console.error('unknown gameState', gameState.state);
      return copyWith(gameState, {
        state: undefined
      });
  }
};
