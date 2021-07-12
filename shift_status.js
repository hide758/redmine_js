// パスパターン /issues/*

$(function() {
    var ActiveTrackers = ["1.DR情報‗駆動S/W開発G"]; //「次ステータスへ移動」ボタン追加トラッカー


    // 該当トラッカーのとき
    if ($.inArray($("#issue_tracker_id option:selected").text(), ActiveTrackers) != -1) {
        var status_next_button = '<button id="status-next-button">次ステータスへ移動</button>';

        $("#history").before(status_next_button);


        // ハードウェア番号クリアボタン押下
        $("#status-next-button").on("click", function() {
            var next_status_id = $("#issue_status_id option:last").val();
            var send_data = {
                "issue": {
                    "status_id": next_status_id
                }
            };

            $.ajax({
                    headers: { 'X-Redmine-API-Key': ViewCustomize["context"]["user"]["apiKey"] },
                    type: "PUT",
                    url: location.href + ".json",
                    dataType: "json",
                    contentType: 'application/json',
                    data: JSON.stringify(send_data)
                })
                .then(
                    function(data, textStatus, jqXHR) {
                        location.reload();
                    },
                    function(jqXHR, textStatus, errorThrown) {});

        });

    }

});