function save_options() {
  var ratingsfilter = document.getElementById('ratingsfilter').value;
  chrome.storage.sync.set({
    ratingsfilter: ratingsfilter,
  }, function() {
    // Update status to let user know options were saved.
    var status = document.getElementById('status');
    status.textContent = 'Options saved.';
    setTimeout(function() {
      status.textContent = '';
    }, 750);
  });
}

function restore_options() {
  chrome.storage.sync.get({
    ratingsfilter: '',
  }, function(items) {
    document.getElementById('ratingsfilter').value = items.ratingsfilter;
  });
}
document.addEventListener('DOMContentLoaded', restore_options);
document.getElementById('save').addEventListener('click', save_options);
