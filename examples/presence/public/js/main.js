
/**
 * Alias superagent
 */

request = superagent;

/**
 * Initialize db
 */

var db = mydb();

/**
 * Fetch the room.
 */

var room = db('/', function (obj, ops) {
  var doc = db('/session/' + obj._id + '/' + user_id, function (o) {
    var $bio = $.bind(doc, 'bio').addClass('bio');
    var $edit = $('<a href="#" class="edit">Edit</a>').click(function (ev) {
      ev.preventDefault();
      $('#user').addClass('edit');
      $area.val(o.bio);
    });

    var $form = $('<form><textarea/><button>Save</button>'
        + '<a href="#">Cancel</a></form>')
      , $area = $form.find('textarea')

    $form.submit(function (ev) {
      ev.preventDefault();
      request.post('/bio').send({ bio: $area.val() }).end();
      $('#user').removeClass('edit');
    });

    $form.find('a').click(function (ev) {
      ev.preventDefault();
      $('#user').removeClass('edit');
    });

    $('<div id="user">').prependTo('#presence').append(
        $('<img src="' + o.avatar + '">')
      , $.bind(doc, 'name').addClass('name')
      , $.bind(doc, 'connections', true).addClass('connections')
      , $bio
      , $form
      , $edit
    );
  });

  if (obj.users) obj.users.forEach(user);
  ops.on('users', 'push', user);
});

/**
 * Fetches an user.
 */

function user (id) {
  if (id != user_id) {
    var doc = db('/user/' + id, function (obj, ops) {
      var el = $('<div>').append(
          $('<img src="' + obj.avatar + '">')
        , $.bind(doc, 'name').addClass('name')
        , $.bind(doc, 'connections', true).addClass('connections')
        , $.bind(doc, 'bio').addClass('bio')
      );
      $('#users').append(el);

      function connections () {
        if (obj.connections > 0) {
          el.addClass('connected');
        } else {
          el.removeClass('connected');
        }
      }
      connections();
      ops.on('connections', 'inc', connections);
    });
  } else {
    console.log('current user');
  }
}

/**
 * Bind shortcut
 */

$.bind = function (doc, field, highlight) {
  var el = $('<span>');
  el.text(doc.obj[field]);
  doc.ops.on(field, function () {
    el.text(doc.obj[field]);
    if (!noHighlight) {
      el.highlight();
    }
  });
  return el;
}

$.fn.highlight = function () {
  var el = $(this);
  el.addClass('highlight-target');
  setTimeout(function () {
    el.addClass('highlight');
    el.one('webkitTransitionEnd', function () {
      el.removeClass('highlight').removeClass('highlight-target');
    });
  }, 10);
  return el;
}
