// パスパターン /issues/*

$(function() {
    var ActiveTrackers = ["1.DR情報‗駆動S/W開発G"]; //「次ステータスへ移動」ボタン追加トラッカー
    var FinishStatus = 14; // 子チケットの完了ステータス番号

    // 編集画面からステータスを削除
    $(".splitcontentleft p:first").hide();

    // 該当トラッカーのとき
    if ($.inArray($("#issue_tracker_id option:selected").text(), ActiveTrackers) != -1) {
        // 現在閲覧中のユーザーID
        var CurrentUserId = ViewCustomize["context"]["user"]["id"];

        // チケット担当者ID
        var IssueCreater = Number($("#issue_assigned_to_id option:selected").val());

        // 出席者ID
        var Attendees = Array.from(new Set($("#issue_custom_field_values_28").val())).map(Number);

        // 閲覧者の権限を設定
        var Role = "Visitor";
        if (CurrentUserId == IssueCreater) {
            Role = "Creater";
        } else {
            if ($.inArray(CurrentUserId, Attendees) != -1) {
                Role = "Attendee";
            }
        }

        // 現在のステータスを取得
        CurrentStatusStr = $("#issue_status_id option:selected").text();

        // 「次ステータスへ移動」ボタン
        var status_next_button = '<button id="status-next-button">次ステータスへ移動</button>';

        switch (Role) {
            case "Creater":
                if (CurrentStatusStr == "記入") {
                    $("#history").before(status_next_button);
                }
                break;

            case "Attendee":
                if (CurrentStatusStr == "完了回覧中") {
                    $("#history").before(status_next_button);
                }
                break;

            case "Visitor":
                break;
        }

        // 「次ステータスへ移動」ボタン押下
        $("#status-next-button").on("click", function() {
            function SetNextStatus() {
                var StatusIdForWorkFrow = [13, 11, 14]; //記入->完了回覧中->完了
                var NextStatusId;

                switch (CurrentStatusStr) {
                    case "記入":
                        NextStatusId = 11; // 次は「完了回覧中」
                        break;
                    case "完了回覧中":
                        NextStatusId = 14; // 次は「完了」
                        break;
                }
                var send_data = {
                    "issue": {
                        "status_id": NextStatusId
                    }
                };

                $.ajax({
                        headers: { 'X-Redmine-API-Key': ViewCustomize["context"]["user"]["apiKey"] },
                        type: "PUT",
                        url: location.pathname + ".json",
                        dataType: "json",
                        contentType: 'application/json',
                        data: JSON.stringify(send_data)
                    })
                    .then(
                        function(data, textStatus, jqXHR) {
                            location.reload();
                        },
                        function(jqXHR, textStatus, errorThrown) {
                            location.reload();
                        });
            }

            function SetNextStatus_Child(TicketNo) {
                var send_data = {
                    "issue": {
                        "status_id": FinishStatus
                    }
                };

                $.ajax({
                        headers: { 'X-Redmine-API-Key': ViewCustomize["context"]["user"]["apiKey"] },
                        type: "PUT",
                        url: "/redmine/issues/" + TicketNo + ".json",
                        dataType: "json",
                        contentType: 'application/json',
                        data: JSON.stringify(send_data)
                    })
                    .then(
                        function(data, textStatus, jqXHR) {
                            SetNextStatus();
                            location.reload();
                        },
                        function(jqXHR, textStatus, errorThrown) {
                            location.reload();
                        });
            }

            switch (Role) {
                case "Creater":
                    if (CurrentStatusStr == "記入") {
                        SetNextStatus();
                    }
                    break;

                case "Attendee":
                    if (CurrentStatusStr == "完了回覧中") {
                        $.ajax({
                                headers: { 'X-Redmine-API-Key': ViewCustomize["context"]["user"]["apiKey"] },
                                type: "GET",
                                url: location.pathname + ".json?include=children",
                                dataType: "json",
                                contentType: 'application/json'
                            })
                            .then(
                                function(data, textStatus, jqXHR) {
                                    // 子チケット検索
                                    for (cnt = 0; cnt < data["issue"]["children"].length; cnt++) {
                                        child_id = data["issue"]["children"][cnt]["id"];

                                        $.ajax({
                                                headers: { 'X-Redmine-API-Key': ViewCustomize["context"]["user"]["apiKey"] },
                                                type: "GET",
                                                url: "/redmine/issues/" + String(child_id) + ".json",
                                                dataType: "json",
                                                contentType: 'application/json'
                                            })
                                            .then(
                                                function(data, textStatus, jqXHR) {
                                                    // カスタムフィールドを調査
                                                    for (cnt = 0; cnt < data["issue"]["custom_fields"].length; cnt++) {
                                                        fld = data["issue"]["custom_fields"][cnt];
                                                        if (fld["name"] == "指摘者") {
                                                            // 自分が指摘者の時
                                                            if (fld["value"] == CurrentUserId) {
                                                                // 子チケットを完了にする
                                                                SetNextStatus_Child(data["issue"]["id"]);
                                                                break;
                                                            }
                                                        }
                                                    }
                                                },
                                                function(jqXHR, textStatus, errorThrown) {});
                                    }
                                },
                                function(jqXHR, textStatus, errorThrown) {});

                    }
                    break;

                case "Visitor":
                    break;
            }

        });

    }

});