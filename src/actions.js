var queuedActions = [];

function dispatch(action){
  queuedActions.push(action);
}

module.exports = {
  dispatch: dispatch,
  flush: function(){
    const flushedActions = queuedActions;
    queuedActions = [];
    return flushedActions;
  },

  setTileEditType: function(type){
    dispatch({ type: 'setTileEditType', tileType: type });
  }
};
