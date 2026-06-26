$(function () { // Same as document.addEventListener("DOMContentLoaded"...
  // enable tooltip
  // $('[data-toggle="tooltip"]').tooltip()
  // enable tooltip for dynamic content
  $('body').tooltip({
    selector: '[data-toggle="tooltip"]',
    html: true,
  });

  $('span[data-toggle="tooltip"]').on('shown.bs.tooltip', function () {
    MathJax.Hub.Queue(["Typeset",MathJax.Hub]);

  });
  // Click effect of merge policy
  $("#cmp-leveling").click(function (event) {
    $("#cmp-tiering").removeClass("btn-active");
    $("#cmp-vlsm-tiering").removeClass("btn-active");
    $("#cmp-leveling").addClass("btn-active");
    $("#cmp-vlsm-leveling").addClass("btn-active");
  });
  $("#cmp-tiering").click(function (event) {
    $("#cmp-leveling").removeClass("btn-active");
    $("#cmp-vlsm-leveling").removeClass("btn-active");
    $("#cmp-tiering").addClass("btn-active");
    $("#cmp-vlsm-tiering").addClass("btn-active");
  });
  $("#cmp-vlsm-leveling").click(function (event) {
    $("#cmp-vlsm-tiering").removeClass("btn-active");
    $("#cmp-tiering").removeClass("btn-active");
    $("#cmp-vlsm-leveling").addClass("btn-active");
    $("#cmp-leveling").addClass("btn-active");
  });
  $("#cmp-vlsm-tiering").click(function (event) {
    $("#cmp-vlsm-leveling").removeClass("btn-active");
    $("#cmp-leveling").removeClass("btn-active");
    $("#cmp-vlsm-tiering").addClass("btn-active");
    $("#cmp-tiering").addClass("btn-active");
  });
  $("#vlsm-leveling").click(function (event) {
    $("#vlsm-tiering").removeClass("btn-active");
    $("#vlsm-leveling").addClass("btn-active");
  });
  $("#vlsm-tiering").click(function (event) {
    $("#vlsm-leveling").removeClass("btn-active");
    $("#vlsm-tiering").addClass("btn-active");
  });

  $("#cmp-bg-merging").on("click", function() {
    var label = $(this).next();
    if ($(this).hasClass("checked")) {
      $(this).removeClass("checked");
      $("#cmp-threshold").parent().parent().hide();
      label.attr("data-original-title", "Background merging OFF")
        .tooltip("show");
    } else {
      $(this).addClass("checked");
      $("#cmp-threshold").parent().parent().show();
      label.attr("data-original-title", "Background merging ON")
        .tooltip("show");
    }
  });
  $("#rlsm-bg-merging").on("click", function() {
    var label = $(this).next();
    if ($(this).hasClass("checked")) {
      $(this).removeClass("checked");
      $("#rlsm-threshold").parent().parent().hide();
      label.attr("data-original-title", "Background merging OFF")
        .tooltip("show");
    } else {
      $(this).addClass("checked");
      $("#rlsm-threshold").parent().parent().show();
      label.attr("data-original-title", "Background merging ON")
        .tooltip("show");
    }
  });

  // Same as document.querySelector("#navbarToggle").addEventListener("blur",...
  $("#navbarToggle").blur(function (event) {
    var screenWidth = window.innerWidth;
    if (screenWidth < 991) {
      $("#collapsable-nav").collapse('hide');
    }
  });

  // In Firefox and Safari, the click event doesn't retain the focus
  // on the clicked button. Therefore, the blur event will not fire on
  // user clicking somewhere else in the page and the blur event handler
  // which is set up above will not be called.
  $("#navbarToggle").click(function (event) {
    $(event.target).focus();
  });
});
