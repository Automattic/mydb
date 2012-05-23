
/**
 * Alias superagent
 */

request = superagent;

/**
 * Get the slug.
 */

var path = window.location.pathname.replace(/\?.*/, '');

if (1 == path.length) {
  path = '/' + String(Math.random()).substr(5) 
    + String(Math.random()).substr(5)

  history.replaceState({}, null, path);
}

/**
 * Inject permalink.
 */

$('form').after(
  '<p class="permalink">' + location.protocol + '//' 
    + location.host + path + '</p>'
)

/**
 * Connect.
 */

var doc = mydb()
  , id

/**
 * Get the document
 */

var todo = doc(path, function (obj, ops) {
  form();

  id = obj._id;
  $('p#wait').replaceWith('<p id="none">No items.</p>');

  if (obj.items) {
    obj.items.forEach(item);
  }

  ops.on('items', 'push', item);
  ops.on('items', 'pull', function (obj) {
    $('#item-' + obj._id).remove();
    if (!$('#list li').length && !$('p#wait').length) {
      $('ul').after('<p id="none">No items.</p>')
    }
  });
});

/**
 * Removes items.
 */

$('#list').on('click', 'a', function (ev) {
  ev.preventDefault();
  request
    .del('/item/' + id + '/' + $(this).data('id'))
    .end()
});

/**
 * Inserts an item.
 */

function item (obj) {
  $('p#none').remove();
  $('#list').addClass('square').append(
    $('<li id="item-' + obj._id + '">')
      .text(obj.text)
      .append(' <a href="#" data-id="' + obj._id + '">x</a>')
  );
}

/**
 * Sets up the form.
 */

function form () {
  $('form').submit(function (ev) {
    ev.preventDefault();
    request
      .post('/item')
      .send({
          text: $('form input').val()
        , id: id
      })
      .end();
    $('form').get(0).reset();
  });
}

