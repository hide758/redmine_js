// パスパターン /issues/*

$(function() {
    var ActiveTrackers = ["1.DR情報(照査・検認)"]; //「次ステータスへ移動」ボタン追加トラッカー
    var AdminApiKey ="91c203c8c506c65e7dae30bb0e41ce4fa7f9f63b";

    // 編集画面からステータスを削除
    $(".splitcontentleft p:first").hide();

    // 該当トラッカーのとき
    if ($.inArray($("#issue_tracker_id option:selected").text(), ActiveTrackers) != -1) {
        // 現在閲覧中のユーザーID
        const CurrentUserId = ViewCustomize["context"]["user"]["id"];

        // チケット担当者ID
        const IssueCreaterId = Number($("#issue_assigned_to_id option:selected").val());

        // 出席者ID
        var AttendeeIDs = $('input[name="issue[custom_field_values][28][]"]:checked').map(function(){
            return Number($(this).val());
        }).get();
        if (AttendeeIDs.indexOf(IssueCreaterId) == -1) {
            AttendeeIDs.push(IssueCreaterId);
        }

        // 全ユーザーの詳細情報取得
        var AllUsers = [];
        const ApiLimit = 100;
        $.ajax({    // 初回ユーザー詳細情報取得
            headers: { 'X-Redmine-API-Key': AdminApiKey },
            type: "GET",
            url: `/redmine/users.json?limit=${ApiLimit}&offset=0`,
            dataType: "json",
            contentType: 'application/json',
            success: function(data) {
                // 2回目以降は1回目のtotal_countから全ユーザー情報を取得
                AllUsers = AllUsers.concat(data["users"]);
                let total_count = data["total_count"];

                for(let cnt = ApiLimit; cnt < total_count; cnt += ApiLimit){
                    $.ajax({
                        headers: { 'X-Redmine-API-Key': AdminApiKey },
                        type: "GET",
                        url: `/redmine/users.json?limit=${ApiLimit}&offset=${cnt}`,
                        dataType: "json",
                        contentType: 'application/json',
                        success: function(data) {
                            AllUsers = AllUsers.concat(data["users"]);
                        }
                    });
                }
            }
        });

        
        // 現在閲覧中のユーザー詳細情報取得
        var CurrentUser;
        $.ajax({
            headers: { 'X-Redmine-API-Key': AdminApiKey },
            type: "GET",
            url: "/redmine/users/" + String(ViewCustomize["context"]["user"]["id"]) + ".json",
            dataType: "json",
            contentType: 'application/json',
            success: function(data) {
                CurrentUser = data["user"];
            }
        });

        // チケット担当者詳細情報取得
        var IssueCreater;
        $.ajax({
            headers: { 'X-Redmine-API-Key': AdminApiKey },
            type: "GET",
            url: "/redmine/users/" + String(IssueCreaterId) + ".json",
            dataType: "json",
            contentType: 'application/json',
            success: function(data) {
                IssueCreater = data["user"];
            }
        });

        // 出席者詳細情報取得
        var Attendees = [];
        for (cnt = 0; cnt < AttendeeIDs.length; cnt++) {
            $.ajax({
                headers: { 'X-Redmine-API-Key': AdminApiKey },
                type: "GET",
                url: "/redmine/users/" + String(AttendeeIDs[cnt]) + ".json",
                dataType: "json",
                contentType: 'application/json',
                success: function(data) {
                    Attendees.push(data["user"]);
                }
            });

        }

        // 照査者詳細情報取得
        var Verifyer = [];
        $.ajax({
            headers: { 'X-Redmine-API-Key': AdminApiKey },
            type: "GET",
            url: $(".cf_50 .value").children("a").attr("href") + ".json",
            dataType: "json",
            contentType: 'application/json',
            success: function(data) {
                Verifyer.push(data["user"]);
            }
        });
        $.ajax({
            headers: { 'X-Redmine-API-Key': AdminApiKey },
            type: "GET",
            url: $(".cf_51 .value").children("a").attr("href") + ".json",
            dataType: "json",
            contentType: 'application/json',
            success: function(data) {
                Verifyer.push(data["user"]);
            }
        });
        
        // 検認詳細情報取得
        var Approver;
        $.ajax({
            headers: { 'X-Redmine-API-Key': AdminApiKey },
            type: "GET",
            url: $(".cf_52 .value").children("a").attr("href") + ".json",
            dataType: "json",
            contentType: 'application/json',
            success: function(data) {
                Approver = data["user"];
            }
        });

        // 照査者1ID
        var Reviewer1ID = Number($('#issue_custom_field_values_50').val());

        // 照査者2ID
        var Reviewer2ID = Number($('#issue_custom_field_values_51').val());

        // 検認者ID
        var ApproverID = Number($('#issue_custom_field_values_52').val());

        // 現在のステータスを取得
        CurrentStatusStr = $("#issue_status_id option:selected").text();


        // 閲覧者の権限を設定
        var Role;
        switch(CurrentStatusStr) {  // 現在のステータス
            case "照査1":
                if (CurrentUserId == Reviewer1ID) {
                    Role = "Reviewer"
                }
                break;

            case "照査2":
                if (CurrentUserId == Reviewer2ID) {
                    Role = "Reviewer"
                }
                break;
            
            case "検認":
                if (CurrentUserId == ApproverID) {
                    Role = "Approver"
                }
                break;
            
            default:
                Role = "Visitor";
                if (CurrentUserId == IssueCreaterId) {
                    Role = "Creater";
                } else {
                    if ($.inArray(CurrentUserId, AttendeeIDs) != -1) {
                        Role = "Attendee";
                    }
                }
        }

        // 子チケットの詳細一覧取得
        function GetChildTicketDetail() {
            let ret = [];
            $.ajax({
                headers: { 'X-Redmine-API-Key': ViewCustomize["context"]["user"]["apiKey"] },
                type: "GET",
                url: `/redmine/issues.json?parent_id=${ViewCustomize["context"]["issue"]["id"]}`,
                dataType: "json",
                async: false,
                contentType: 'application/json',
                success: function(data) {
                    ret = data["issues"];
                },
                error: function() {
                    console.log("error");
                }
            });

            return ret;
        }


        // 「次ステータスへ移動」ボタン
        const status_next_button = '<button id="status-next-button" class="move-next-status">次ステータスへ移動</button>';
        // 「照査」ボタン
        const status_reviwed_button = '<button id="status-reviewd-button" class="move-next-status">照査</button>';
        // 「検認」ボタン
        const status_approved_button = '<button id="status-approved-button" class="move-next-status">検認</button>';
        // 「差し戻し」ボタン
        const status_send_back_button = '<button id="status-send-back-button" class="move-back-status">差し戻し</button>';

        // 記入->指摘確認->指摘処置中->処置確認->照査1->照査2->検認->完了
        // ステータス遷移ボタン表示
        switch (Role) {
            case "Creater":     // 作成者
                if (["照査1","照査2","検認","完了"].indexOf(CurrentStatusStr) == -1) {
                    $("#history").before(status_next_button);
                }
                break;

            case "Attendee":    // 出席者
                if (["指摘確認", "処置確認"].indexOf(CurrentStatusStr) != -1) {
                    $("#history").before(status_next_button);
                }
                break;

            case "Reviewer":    // 照査者
                $("#history").before(status_reviwed_button);
                $("#history").before(status_send_back_button);
                break

            case "Approver":    // 検認者
                $("#history").before(status_approved_button);
                $("#history").before(status_send_back_button);
                break

            case "Visitor":    // 閲覧者
                break;
        }

        // 通知メール送信
        function SendNoticeMail() {
            var To = [];
            var From = "";
            var Name = "";
            var Cc = [];
            var Subject = "";
            var Content = "";

            const DeadLineDate = new Date(Date.now() + 3 * 24 * 3600 * 1000);

            // 作成者をメールFromに設定
            for (cnt = 0; cnt < Attendees.length; cnt++) {
                if (Attendees[cnt]["id"] == IssueCreaterId) {
                    From = Attendees[cnt]["mail"];
                    Name = Attendees[cnt]["lastname"] + Attendees[cnt]["firstname"];
                }
            }

            // 記入->指摘確認->指摘処置中->処置確認->照査1->照査2->検認->完了
            switch (CurrentStatusStr) {
                case "記入":
                case "指摘処置中":
                    // メール宛先を参加者に設定
                    for (cnt = 0; cnt < Attendees.length; cnt++) {
                        if (Attendees[cnt]["id"] != IssueCreaterId) {
                            To.push(Attendees[cnt]["mail"]);
                        }
                    }

                    // 指摘者ごとに子チケットを表示
                    const ChildTickets = GetChildTicketDetail();
                    let ChildTicketsPointer = {};
                    ChildTickets.forEach((ChildTicket) => {
                        // 指摘者とチケットの対応関係を記録
                        const PointerId = ChildTicket["custom_fields"].find(element => element.name == "指摘者")["value"];
                        if(PointerId in ChildTicketsPointer){
                            ChildTicketsPointer[PointerId].push(ChildTicket["id"]);
                        }
                        else{
                            ChildTicketsPointer[PointerId] = [ChildTicket["id"]];
                        }
                    });


                    let PointList = "";
                    Object.keys(ChildTicketsPointer).map(key => {
                        const Pointer = AllUsers.find(element => element.id == key);
                        PointList += "・" + Pointer["lastname"] + Pointer["firstname"] + "さん\n";

                        ChildTicketsPointer[key].forEach((id) => {
                            PointList += `http://meie2eb6/redmine/issues/${id}\n`;
                        });

                        PointList += "\n";
                    });


                    Cc.push(From);
                    Subject = "[確認依頼]";
                    Subject += $(".cf_7 .value").text(); // 工程
                    Subject += " " + $(".subject h3").text(); // チケット名
                    Description = $(".description .wiki")[0].innerText;
                    Content = `
各位

首題の件の指摘をご確認ください。
http://meie2eb6/redmine/issues/${ViewCustomize["context"]["issue"]["id"]}
確認できたら「次ステータスへ移動」をクリックしてください。

期限：${DeadLineDate.getMonth()+1}月${DeadLineDate.getDate()}日希望

よろしくお願いいたします。

★${$(".subject h3").text()}
${Description}

★指摘
${PointList}
`;
                    break;

                case "指摘確認":
                    // メール宛先を作成者に設定
                    To.push(From);
                    for (cnt = 0; cnt < Attendees.length; cnt++) {
                        if (Attendees[cnt]["id"] == CurrentUserId) {
                            CurrentUserName = Attendees[cnt]["lastname"] + Attendees[cnt]["firstname"];
                        }
                    }

                    Subject = "[確認完了]";
                    Subject += $(".cf_7 .value").text(); // 工程
                    Subject += " " + $(".subject h3").text(); // チケット名
                    Content = `
指摘の確認が完了しました。

http://meie2eb6/redmine/issues/${ViewCustomize["context"]["issue"]["id"]}
「次ステータスへ移動」をクリックしてください。

以上
`;
                    break;

                case "処置確認":
                    // メール宛先を照査1に設定
                    To.push(Verifyer[0]["mail"]);
                    Cc.push(From);

                    Subject = "[照査依頼]";
                    Subject += $(".cf_7 .value").text(); // 工程
                    Subject += " " + $(".subject h3").text(); // チケット名
                    Content = `
${Verifyer[0]["lastname"]} ${Verifyer[0]["firstname"]} さん

照査をお願いいたします。

http://meie2eb6/redmine/issues/${ViewCustomize["context"]["issue"]["id"]}
「照査」をクリックしてください。

以上
`;
                    break

                case "照査1":
                    // メール宛先を照査2に設定
                    To.push(Verifyer[1]["mail"]);
                    Cc.push(From);

                    Subject = "[照査依頼]";
                    Subject += $(".cf_7 .value").text(); // 工程
                    Subject += " " + $(".subject h3").text(); // チケット名
                    Content = `
${Verifyer[1]["lastname"]} ${Verifyer[1]["firstname"]} さん

照査をお願いいたします。

http://meie2eb6/redmine/issues/${ViewCustomize["context"]["issue"]["id"]}
「照査」をクリックしてください。

以上
`;
                    break

                case "照査2":
                    // メール宛先を検認者に設定
                    To.push(Approver["mail"]);
                    Cc.push(From);

                    Subject = "[検認依頼]";
                    Subject += $(".cf_7 .value").text(); // 工程
                    Subject += " " + $(".subject h3").text(); // チケット名
                    Content = `
${Approver["lastname"]} ${Approver["firstname"]} さん

検認をお願いいたします。

http://meie2eb6/redmine/issues/${ViewCustomize["context"]["issue"]["id"]}
「検認」をクリックしてください。

以上
`;
                    break

                    case "検認":
                        // メール宛先を検認者に設定
                        To.push(IssueCreater["mail"]);
                        Cc.push(Approver["mail"]);
    
                        Subject = "[回覧完了]";
                        Subject += $(".cf_7 .value").text(); // 工程
                        Subject += " " + $(".subject h3").text(); // チケット名
                        Content = `
${IssueCreater["lastname"]} ${IssueCreater["firstname"]} さん
    
回覧完了しました。
    
http://meie2eb6/redmine/issues/${ViewCustomize["context"]["issue"]["id"]}

以上
`;
                        break
                }

                $.ajax({
                    type: "POST",
                    url: "/redmine_tools/mail.php",
                    dataType: "json",
                    data: {
                        "to": To.join(","),
                        "from": From,
                        "name": Name,
                        "cc": Cc.join(","),
                        "subject": Subject,
                        "content": Content
                    }
            });

        }

        // 「次ステータスへ移動」「照査」「検認」ボタン押下
        $(".move-next-status").on("click", function() {
            function SetNextStatus() {
                var NextStatusId;

                // 記入->指摘確認->指摘処置中->処置確認->照査1->照査2->検認->完了
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
                        NextStatusId = 18; // 次は「照査1」
                        break;
                    case "照査1":
                        NextStatusId = 19; // 次は「照査2」
                        break;
                    case "照査2":
                        NextStatusId = 20; // 次は「検認」
                        break;
                    case "検認":
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
                    async: false,
                    contentType: 'application/json',
                    data: JSON.stringify(send_data),
                    success: function(data) {
                        SendNoticeMail();
                    },
                    error: function() {
                        console.log("error");
                    }
                });
            }

            function SetNextStatus_Child(TicketNo, CurrentStatusStrChild) {
                // 記入->指摘確認済->完了
                switch (CurrentStatusStrChild) {
                    case "記入":
                        NextStatusId = 9; // 次は「指摘確認済」
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
                    async: false,
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
                                if ((CurrentStatusStr == "指摘確認" && ChildTickets[cnt_ct]["status"]["name"] == "記入") ||
                                    (CurrentStatusStr == "処置確認" && ChildTickets[cnt_ct]["status"]["name"] == "指摘確認済")) {
                                    // 子チケットのステータスを進める
                                    SetNextStatus_Child(ChildTickets[cnt_ct]["id"], ChildTickets[cnt_ct]["status"]["name"]);
                                }
                            }
                            break;
                        }
                    }
                }
            }

            function SetNextStatusWhenChildFinish() {
                // すべての子チケットがチェック完了していたら
                // 親チケットを次のステータスにする
                var ChildCheckedStr;

                if (CurrentStatusStr == "指摘確認") {
                    ChildCheckedStr = "指摘確認済"
                } else {
                    ChildCheckedStr = "完了"
                }

                var NextFlag = true;
                const ChildTickets = GetChildTicketDetail();
                for (var cnt = 0; cnt < ChildTickets.length; cnt++) {
                    if (ChildTickets[cnt]["status"]["name"] != ChildCheckedStr) {
                        NextFlag = false;
                        break;
                    }
                }
                if (NextFlag == true) {
                    SetNextStatus();
                }
            }

            // 記入->指摘確認->指摘処置中->処置確認->照査1->照査2->検認->完了
            switch (Role) {
                case "Creater":
                    if (["記入", "指摘処置中"].indexOf(CurrentStatusStr) != -1) {
                        SetNextStatus();
                    } else if (["指摘確認", "処置確認"].indexOf(CurrentStatusStr) != -1) {
                        // 自分の子チケットを次のステータスにする
                        CheckChildTicket();
                        SetNextStatusWhenChildFinish();
                    }
                    break;

                case "Reviewer":
                case "Approver":
                    SetNextStatus();
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
            alert("ステータスを更新しました");
            location.reload();

        });

        // 「差し戻し」ボタン押下
        $(".move-back-status").on("click", function() {
            const dialoghtml = `
            <div id="status-move-back-dialog" style="padding:20px;">
                <textarea id="move-back-instruction" placeholder="差し戻しコメント" style="display:block; width:100%;"></textarea>
            </div>
            `;
            $(dialoghtml).dialog({
                modal:true,
                title:"差し戻し",
                width:500,
                buttons: {
                    "OK": function() {
                        console.log("OK")
                        let NextStatusId;

                        // 記入->指摘確認->指摘処置中->処置確認->照査1->照査2->検認->完了
                        switch (CurrentStatusStr) {
                            case "照査1":
                            case "照査2":
                            case "検認":
                                NextStatusId = 11; // 処置確認」へ戻る
                                break;
                        }
                        var send_data = {
                            "issue": {
                                "status_id": NextStatusId,
                                "notes": "[差し戻し]\n" + $("#move-back-instruction").val()
                            }
                        };
            
                        $.ajax({
                            headers: { 'X-Redmine-API-Key': ViewCustomize["context"]["user"]["apiKey"] },
                            type: "PUT",
                            url: location.pathname + ".json",
                            dataType: "json",
                            async: false,
                            contentType: 'application/json',
                            data: JSON.stringify(send_data),
                            success: function(data) {
                                // 差し戻しメール通知
                                Subject = "[差し戻し]";
                                Subject += $(".cf_7 .value").text(); // 工程
                                Subject += " " + $(".subject h3").text(); // チケット名
                                Content = `
${IssueCreater["lastname"]} ${IssueCreater["firstname"]} さん

${CurrentUser["lastname"]} ${CurrentUser["firstname"]} さんが差し戻しました。

【コメント】
${$("#move-back-instruction").val()}

http://meie2eb6/redmine/issues/${ViewCustomize["context"]["issue"]["id"]}


以上
`;
            
                                $.ajax({
                                    type: "POST",
                                    url: "/redmine_tools/mail.php",
                                    dataType: "json",
                                    data: {
                                        "to": IssueCreater["mail"],
                                        "from": CurrentUser["mail"],
                                        "name": CurrentUser["lastname"] + CurrentUser["firstname"],
                                        "cc": CurrentUser["mail"],
                                        "subject": Subject,
                                        "content": Content
                                    }
                                });
                            }
                        });
                        $(this).dialog("destroy");
                        location.reload();
                        alert("ステータスを更新しました");
                    },
                    "キャンセル": function() {
                        $(this).dialog("destroy");
                    }
                }
            });
        });
    }
});