$('.btn').click(function () {
  socket.emit('categorySelect', {
    category: $(this).data('category'),
    value: $(this).data('value'),
  });
});
