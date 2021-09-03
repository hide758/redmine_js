// パスパターン /issues/*

$(function() {
    var ActiveTrackers = ["1.DR情報"]; //「次ステータスへ移動」ボタン追加トラッカー

    // 編集画面からステータスを削除
    $(".splitcontentleft p:first").hide();

    // 該当トラッカーのとき
    if ($.inArray($("#issue_tracker_id option:selected").text(), ActiveTrackers) != -1) {
        // 現在閲覧中のユーザーID
        const CurrentUserId = ViewCustomize["context"]["user"]["id"];

        // チケット担当者ID
        const IssueCreater = Number($("#issue_assigned_to_id option:selected").val());

        // 出席者ID
        const Attendees = Array.from(new Set($("#issue_custom_field_values_28").val())).map(Number);

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
        const status_next_button = '<button id="status-next-button">次ステータスへ移動</button>';

        // 記入->指摘確認->指摘処置中->処置確認->完了
        switch (Role) {
            case "Creater":
                if (CurrentStatusStr != "完了") {
                    $("#history").before(status_next_button);
                }
                break;

            case "Attendee":
                if (["指摘確認", "処置確認"].indexOf(CurrentStatusStr) != -1) {
                    $("#history").before(status_next_button);
                }
                break;

            case "Visitor":
                break;
        }

        // 「次ステータスへ移動」ボタン押下
        $("#status-next-button").on("click", function() {
            function SendNoticeMail(){

            }
            function SetNextStatus() {
                var NextStatusId;
                var mail_to;
                var mail_subject;
                var mail_content;

                // 記入->指摘確認->指摘処置中->処置確認->完了
                switch (CurrentStatusStr) {
                    case "記入":
                        NextStatusId = 10; // 次は「指摘確認」

                        break;
                    case "指摘確認":
                        NextStatusId = 12; // 次は「指摘処置中」
                        break;
                    case "指摘処置中":
                        NextStatusId = 11; // 次は「処置確認」
                        break;
                    case "処置確認":
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
                        async:false,
                        contentType: 'application/json',
                        data: JSON.stringify(send_data)
                    });
            }

            function SetNextStatus_Child(TicketNo, CurrentStatusStrChild) {
                // 記入->指摘確認済->完了
                switch (CurrentStatusStrChild) {
                    case "記入":
                        NextStatusId = 9;  // 次は「指摘確認済」
                        break;
                    case "指摘確認済":
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
                        url: "/redmine/issues/" + TicketNo + ".json",
                        dataType: "json",
                        async:false,
                        contentType: 'application/json',
                        data: JSON.stringify(send_data)
                });
            }
            function CheckChildTicket() {
                const ChildTickets = GetChildTicketDetail();
                for (cnt_ct = 0; cnt_ct < ChildTickets.length; cnt_ct++) {
                    // カスタムフィールドを調査
                    for (cnt_cf = 0; cnt_cf < ChildTickets[cnt_ct]["custom_fields"].length; cnt_cf++) {
                        fld = ChildTickets[cnt_ct]["custom_fields"][cnt_cf];
                        if (fld["name"] == "指摘者") {
                            // 自分が指摘者の時
                            if (fld["value"] == CurrentUserId) {
                                if((CurrentStatusStr == "指摘確認" && ChildTickets[cnt_ct]["status"]["name"] == "記入") ||
                                (CurrentStatusStr == "処置確認" && ChildTickets[cnt_ct]["status"]["name"] == "指摘確認済")){
                                    // 子チケットのステータスを進める
                                    SetNextStatus_Child(ChildTickets[cnt_ct]["id"], ChildTickets[cnt_ct]["status"]["name"]);
                                }
                            }
                            break;
                        }
                    }
                }
            }

            // 子チケットの詳細一覧取得
            function GetChildTicketDetail() {
                var ret = [];

                $.ajax({
                    headers: { 'X-Redmine-API-Key': ViewCustomize["context"]["user"]["apiKey"] },
                    type: "GET",
                    url: location.pathname + ".json?include=children",
                    dataType: "json",
                    async:false,
                    contentType: 'application/json',
                    success: function(data_list) {
                        // 子チケット検索
                        for (cnt = 0; cnt < data_list["issue"]["children"].length; cnt++) {
                            child_id = data_list["issue"]["children"][cnt]["id"];

                            $.ajax({
                                    headers: { 'X-Redmine-API-Key': ViewCustomize["context"]["user"]["apiKey"] },
                                    type: "GET",
                                    url: "/redmine/issues/" + String(child_id) + ".json",
                                    dataType: "json",
                                    async:false,
                                    contentType: 'application/json',
                                    success: function(data) {
                                        ret.push(data["issue"]);
                                    }});
                        }
                    }
                });

                return ret;
            }
            function SetNextStatusWhenChildFinish(){
                // すべての子チケットがチェック完了していたら
                // 親チケットを次のステータスにする
                var ChildCheckedStr;

                if(CurrentStatusStr == "指摘確認"){
                    ChildCheckedStr = "指摘確認済"
                }
                else{
                    ChildCheckedStr = "完了"
                }

                const ChildTickets = GetChildTicketDetail();
                var NextFlag = true;
                for(var cnt = 0; cnt < ChildTickets.length; cnt++){
                    if(ChildTickets[cnt]["status"]["name"] != ChildCheckedStr){
                        NextFlag = false;
                        break;
                    }
                }
                if(NextFlag == true){
                    SetNextStatus();
                }
            }

            // 記入->指摘確認->指摘処置中->処置確認->完了
            switch (Role) {
                case "Creater":
                    if (["記入", "指摘処置中"].indexOf(CurrentStatusStr) != -1) {
                        SetNextStatus();
                    }
                    else if (["指摘確認", "処置確認"].indexOf(CurrentStatusStr) != -1) {
                        // 自分の子チケットを次のステータスにする
                        CheckChildTicket();
                        SetNextStatusWhenChildFinish();
                    }
                    break;

                case "Attendee":
                    if (["指摘確認", "処置確認"].indexOf(CurrentStatusStr) != -1) {
                        CheckChildTicket();
                        SetNextStatusWhenChildFinish();
                    }
                    break;

                case "Visitor":
                    break;
            }
            location.reload();

        });

    }

});