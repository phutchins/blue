 $(function() {
  $("ul").each(function(idx) {
    console.log("Each: "+idx);
      $(this).sortable({
        connectWith: ".connectedSortable",
        update: function() {
        console.log("Order ("+idx+"): "+$(this).sortable('toArray').toString());
      }
    }).disableSelection();
  });

  //var order1 = $('#sortable1').sortable('toArray').toString();
  //var order2 = $('#sortable2').sortable('toArray').toString();
  //alert("Order 1:"+order1+"\n Order 2:"+order2);
});
