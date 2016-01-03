if (!String.format) {
    String.format = function (format) {
        var args = Array.prototype.slice.call(arguments, 1);
        return format.replace(/{(\d+)}/g, function (match, number) {
            return typeof args[number] != 'undefined' ? args[number] : match;
        });
    };
}

var mersenne = new MersenneTwister(Date.now());

function random(min, max) {
    return Math.floor(mersenne.random() * (max - min + 1)) + min;
}

function GameState() {
}
GameState.prototype = {
    current_player: 0
};

function Item() {
}
Item.prototype = {
    name: "道具",
    avatar: "",
    description: "这是一个道具",
    quote: "一句厉害的话."
};

function Player() {
}
Player.prototype = {
    name: "第一组",
    avatar: "avatar.jpg",
    score: 0,
    position: 0,
    items: []
};

QuesCategory = {
    "129": 0,
    "poem": 1,
    "sports": 2,
    "common": 3,
    "culture": 4
};

QuesType = {
    Choice: 0,
    Answer: 1,
    Task: 2
};

function Question() {
}
Question.prototype = {
    category: QuesCategory["129"],
    type: QuesType.Choice,
    question: "这道题的答案是啥?",
    choices: ["A", "B", "C", "D"],
    answer: 2,
    explanation: "就是这个答案,不要问了.",
    setter: "",
    points: 100
};

function Category() {
}
Category.prototype = {
    name: "",
    questions: [],
    board_color: "red"
};

Palette = {
    red: "#f44336",
    purple: "#9c27b0",
    blue: "#2196f3",
    orange: "#ef6c00",
    brown: "#795548",
    grey: "#607d8b",
    cyan: "#0097a7",
    green: "#689f38"
};

PosType = {
    Normal: 0,
    Item: 1,
    Event: 2
};

function Position() {
}
Position.prototype = {
    x: 100,
    y: 100,
    name: "神秘地点",
    type: PosType.Item // QuesCategory["129"]
};

function Board() {
}
Board.prototype = {
    positions: null
};

function Game(obj) {
    for (var prop in obj)
        this[prop] = obj[prop];
}
Game.prototype = {
    players: [],
    categories: [],
    items: [],
    events: [],
    board: null,
    state: null
};

var game;

function init(text) {
    var data = JSON.parse(text);
    game = new Game(data);
    for (var x = 0; x < game.players.length; ++x) {
        var player = game.players[x];
        player.position = 0;
        player.score = 0;
        player.items = [];
        player.next_turn = false;
        player.allies = [];
        player.party = 0;
        player.movie = false;
        player.spy = false;
        player.skip = true;
    }
    game.state = new GameState();
}

function readFile(file, callback) {
    var rawFile = new XMLHttpRequest();
    rawFile.open("GET", file, false);
    rawFile.onreadystatechange = function () {
        if (rawFile.readyState === 4) {
            if (rawFile.status === 200 || rawFile.status == 0) {
                var allText = rawFile.responseText;
                callback(allText);
            }
        }
    };
    rawFile.send(null);
}

readFile("gamedata.json", init);

// apply one-time-only animation using animate.css
function animate(item, animation, callback) {
    item.removeClass("animationend animated " + animation)
        .addClass("animated " + animation)
        .one("animationend", function () {
            $(this).removeClass("animationend animated " + animation);
            if (typeof callback !== typeof undefined)
                callback(item, animation);
        });
}

function test(x) {
    game.players[3].position += 1;
    placeMapWidgets();
    setTimeout(function () {
        test(x + 1);
    }, 500);
}

function findOrder(x, xs) {
    for (var i in xs) {
        if (xs[i] === x) return i;
    }
    return -1;
}

function placeMapWidgets() {
    var groups = {}, position = [], containers = [];
    for (var x = 0; x < game.players.length; ++x) {
        groups[game.players[x].position] = [];
        position.push(game.players[x].position);
        containers.push($("#mapwidget-container-" + x.toString()));
    }
    for (x = 0; x < game.players.length; ++x) {
        groups[position[x]].push(x);
    }
    for (var id in groups) {
        groups[id].sort(function (x, y) {
            return -(containers[x].css("z-index") - containers[y].css("z-index"));
        });
    }

    for (x = 0; x < game.players.length; ++x) {
        var pos = game.board.positions[position[x]];
        var delta = (findOrder(x, groups[position[x]]) - (groups[position[x]].length - 1) / 2) * 5;
        $("#mapwidget-" + x.toString()).animate({
            left: pos.x - 20 + delta,
            top: pos.y - 20 + delta
        }, "fast");
        $("#listview-" + x.toString()).find(".place").find("strong")
            .html(game.board.positions[position[x]].name);
    }
}

function updateRanklist() {
    var index = [], score_before = [], rank = [];
    for (var x = 0; x < game.players.length; ++x) {
        index.push(x);
        var item = $("#listview-" + x.toString()).find(" .score");
        score_before.push(item.html());
        item.html(game.players[x].score.toString());
    }
    index.sort(function (x, y) {
        return -(game.players[x].score - game.players[y].score);
    });
    for (x = 0; x < game.players.length; ++x) {
        var id = index[x];
        rank.push((x > 0 && game.players[index[x - 1]].score == game.players[index[x]].score)
            ? rank[x - 1] : (x + 1));
        var item = $("#listview-" + id.toString());
        $("#score-ranklist").find("> hr:nth-of-type(" + (x + 1).toString() + ")").before(item);
        item.find(".rank").html(rank[x].toString());
        if (score_before[id] != game.players[id].score) {
            animate(item, "flash");
        }
    }
    $(".left-column-item").removeClass("active");
    if (game.state.current_player >= 0 && game.state.current_player < game.players.length) {
        $("#listview-" + game.state.current_player.toString()).addClass("active");
    }
}

function processText(str) {
    var ret = "", cover = 0;
    for (var x = 0; x < str.length; ++x) {
        if (str[x] === '<') {
            ++cover;
        } else if (str[x] === '>') {
            --cover;
        }
        if (cover) {
            ret += str[x];
        } else if (str[x] === '\n') {
            if (x > 0 && str[x - 1] !== '>')
                ret += "</p>";
            if (x + 1 < str.length && str[x + 1] !== "<")
                ret += "<p>";
        } else if (str[x] === ' ') {
            ret += "&nbsp;";
        } else {
            ret += str[x];
        }
    }
    return ret;
}

function showQuestion(question, callback) {
    var category = game.categories[question.category];

    var other_player_id = -1;

    var modal_raw_html;
    readFile("assets/question_modal.html", function (data) {
        modal_raw_html = data;
    });

    $("body").append(modal_raw_html);
    var modal = $("#question-modal");
    modal.find("#question-category").html(category.name);
    modal.find("#question-text").html(processText(question.question));
    if (typeof question.explanation !== typeof undefined) {
        modal.find("#question-answer").html(processText(question.explanation));
    }
    modal.find(".modal-title").find("div div").html(question.points.toString());
    modal.find("#question-setter").html(question.setter);
    modal.find(".modal-header").css("background", Palette[category.board_color]);
    modal.find("img").css("max-width", "60vw");

    var yes_button = $("#modal-yes-button");
    var no_button = $("#modal-no-button");
    var item_button = $("#modal-item-button");
    var show_button = $("#modal-show-button");

    if (game.players[game.state.current_player].spy === true) {
        $(".modal-footer").append(String.format('<div style="margin-top: 10px; font-size:16px">受奸细情报影响，答对不计分</div>'));
    }
    if (game.players[game.state.current_player].allies.length > 0) {
        var text = "与 ";
        for (var x = 0; x < game.players[game.state.current_player].allies.length; ++x) {
            if (x > 0) text += "、 ";
            text += game.players[game.players[game.state.current_player].allies[x]].name + " ";
        }
        text += "结成盟友";
        $(".modal-footer").append(String.format('<div style="margin-top: 10px; font-size:16px">' + text + '</div>'));
    }

    var answer_right = function (player_id) {
        if (game.players[player_id].spy === true) {
            game.players[player_id].spy = false;
            return;
        }
        var my_score = question.points;
        if (other_player_id != -1) {
            my_score = Math.ceil(question.points / 2);
            game.players[other_player_id].score += Math.ceil(question.points / 2);
        }
        game.players[player_id].score += my_score;
        for (var x = 0; x < game.players[player_id].allies.length; ++x) {
            var ally = game.players[player_id].allies[x];
            game.players[ally].score += my_score;
        }
        updateRanklist();
    };

    if (question.type == QuesType.Choice) {
        yes_button.css("display", "none");
        no_button.css("display", "none");
        show_button.css("display", "none");
        yes_button.find("div").html("完成");

        modal.find("#question-text").after(
            '<div style="font-weight: bold; margin-left: 35px">题目选项</div>' +
            '    <ul class="nav nav-stacked">' +
            '        <ul class="question-choices nav nav-stacked nav-pills">' +
            '        </ul>' +
            '    </ul>' +
            '</div>');
        var choices = modal.find(".question-choices");
        choices.html("");
        for (var x = 0; x < question.choices.length; ++x) {
            var choice = String.fromCharCode(65 + x);
            choices.append(
                '<li id="choice-' + choice + '" class="nav-header question-choice" data-choice="' + choice + '">' +
                '    <a class="fake-link">' +
                (choice === question.answer
                    ? ('<span class="pull-left">' +
                '           <span class="glyphicon glyphicon-ok"' +
                '                 style="margin-right: 10px; visibility: hidden; color: green"></span>')
                    : ('<span class="pull-left">' +
                '           <span class="glyphicon glyphicon-remove"' +
                '                 style="margin-right: 10px; visibility: hidden; color: red"></span>')) +
                '    <strong style="color: ' + Palette[category.board_color] + ';">' + choice + '. </strong>' +
                '</span>' + processText(question.choices[x]) + '</a></li>');
        }

        $(".question-choice").click(function () {
            if ($(this).hasClass("disabled")) return;
            if ($(this).data("choice") === question.answer) {
                console.log("correct");
                answer_right(game.state.current_player);
            } else {
                console.log("wrong");
            }
            $(this).find("a span span").css("visibility", "visible");
            $("#choice-" + question.answer).find("a span span").css("visibility", "visible");
            $(".question-choice").addClass("disabled").find("a").css("color", "#2c3e50");

            if (typeof question.explanation !== typeof undefined) {
                $("#question-explanation").collapse();
                var body = $(".modal-body");
                body.animate({"scroll-top": body.height()});
            }

            yes_button.css("display", "");
            item_button.attr("disabled", "disabled");
        });

        yes_button.click(function () {
            modal.modal("hide");
        });

    } else if (question.type == QuesType.Answer) {
        yes_button.css("display", "none");
        no_button.css("display", "none");
        show_button.css("display", "");
        yes_button.find("div").html("正确");
        no_button.find("div").html("错误");

        show_button.click(function () {
            $("#question-explanation").collapse();
            var body = $(".modal-body");
            body.animate({"scroll-top": body.height()});

            show_button.css("display", "none");
            yes_button.css("display", "");
            no_button.css("display", "");
            item_button.attr("disabled", "disabled");
        });

        yes_button.click(function () {
            console.log("correct");
            answer_right(game.state.current_player);
            modal.modal("hide");
        });
        no_button.click(function () {
            console.log("wrong");
            modal.modal("hide");
        });

    } else {    // QuesType.Task
        yes_button.css("display", "");
        no_button.css("display", "");
        show_button.css("display", "none");
        yes_button.find("div").html("成功");
        no_button.find("div").html("失败");

        yes_button.click(function () {
            console.log("correct");
            answer_right(game.state.current_player);
            modal.modal("hide");
        });
        no_button.click(function () {
            console.log("wrong");
            modal.modal("hide");
        });
    }

    item_button.click(function () {
        openItemPanel(game.state.current_player, true, function (player_id, item_type) {
            console.log(player_id, item_type);
            if (item_type == 0) {           // 遥控骰子

            } else if (item_type == 1) {    // 华北书桌: 去掉1个错误答案
                var choice;
                if ($(".question-choice").length == 1) {
                    alert("只剩正确答案了= =");
                    return;
                }
                do {
                    choice = String.fromCharCode(65 + random(0, question.choices.length - 1));
                } while (choice == question.answer || $("#choice-" + choice).length == 0);
                $("#choice-" + choice).remove();
            } else if (item_type == 2) {    // 成立宣言: 结盟

            } else if (item_type == 3) {    // 俄语歌谱: 连续答题

            } else if (item_type == 4) {    // 鲁迅支持: 直接答对
                if (typeof question.explanation !== typeof undefined) {
                    $("#question-explanation").collapse();
                    var body = $(".modal-body");
                    body.animate({"scroll-top": body.height()});
                }
                yes_button.css("display", "");
                no_button.css("display", "none");
                show_button.css("display", "none");
                yes_button.find("div").html("正确");
                if (question.type == QuesType.Choice) {
                    yes_button.click(function () {
                        console.log("correct");
                        if (other_player_id != -1) {
                            game.players[game.state.current_player].score += Math.ceil(question.points / 2);
                            game.players[other_player_id].score += Math.floor(question.points / 2);
                        } else {
                            game.players[game.state.current_player].score += question.points;
                        }
                        updateRanklist();
                    });
                }
            } else if (item_type == 5) {    // 党员领导: 依次前进1 2 9步

            } else if (item_type == 6) {    // 市民食物: 分数翻倍
                question.points *= 2;
                modal.find(".modal-title").find("div div").html(question.points.toString());
            } else if (item_type == 7) {    // 爱国电影: 消除下一个负面效果

            } else if (item_type == 8) {    // 奸细情报: 使一个人答题无效

            } else if (item_type == 9) {    // 无线电台: 求助,对方拿到一半分数
                if (other_player_id != -1) {
                    alert("已经求助过一次了");
                    return;
                }
                chooseOtherPlayer(player_id, function (other_player) {
                    console.log("other ", other_player);
                    other_player_id = other_player;
                    $(".modal-footer").append(String.format('<div style="margin-top: 10px; font-size:16px">由 {0} 协助答题</div>',
                        game.players[other_player].name));
                });
            } else {

            }
        });
    });

    modal.on("hidden.bs.modal", function () {
        callback(question);
        if (question.category != 7) {
            var index = category.questions.indexOf(question);
            if (index > -1) {
                category.questions.splice(index, 1);
            }
            var field = $("#total-questions").find("div");
            var total = parseInt(field.html(), 10);
            field.html((total + 1).toString());
        }
        modal.remove();
    });
    modal.modal();
}

function showFastAnswerQuestion(question, callback) {
    console.log(question);

    var category = game.categories[game.categories.length - 1];

    var player_id = -1;

    readFile("assets/fast_answer_modal.html", function (data) {
        modal_raw_html = data;
    });

    $("body").append(modal_raw_html);
    var modal = $("#question-modal");
    modal.find("#question-category").html(category.name);
    modal.find("#question-text").html(processText(question.question));
    if (typeof question.explanation !== typeof undefined) {
        modal.find("#question-answer").html(processText(question.explanation));
    }
    modal.find(".modal-title").find("div div").html(question.points.toString());
    modal.find("#question-setter").html(question.setter);
    modal.find(".modal-header").css("background", Palette[category.board_color]);
    modal.find("img").css("max-width", "60vw");

    var yes_button = $("#modal-yes-button");
    var no_button = $("#modal-no-button");
    var choose_button = $("#modal-choose-button");
    var show_button = $("#modal-show-button");

    yes_button.css("display", "none");
    no_button.css("display", "none");
    show_button.css("display", "none");

    var answer_right = function (player_id) {
        var my_score = question.points;
        game.players[player_id].score += my_score;
        updateRanklist();
    };
    var answer_wrong = function (player_id) {
        var my_score = -Math.ceil(question.points / 2);
        game.players[player_id].score += my_score;
        updateRanklist();
    };

    if (question.type == QuesType.Choice) {
        modal.find("#question-text").after(
            '<div style="font-weight: bold; margin-left: 35px">题目选项</div>' +
            '    <ul class="nav nav-stacked">' +
            '        <ul class="question-choices nav nav-stacked nav-pills">' +
            '        </ul>' +
            '    </ul>' +
            '</div>');
        var choices = modal.find(".question-choices");
        choices.html("");
        for (var x = 0; x < question.choices.length; ++x) {
            var choice = String.fromCharCode(65 + x);
            choices.append(
                '<li id="choice-' + choice + '" class="nav-header question-choice" data-choice="' + choice + '">' +
                '    <a class="fake-link">' +
                (choice === question.answer
                    ? ('<span class="pull-left">' +
                '           <span class="glyphicon glyphicon-ok"' +
                '                 style="margin-right: 10px; visibility: hidden; color: green"></span>')
                    : ('<span class="pull-left">' +
                '           <span class="glyphicon glyphicon-remove"' +
                '                 style="margin-right: 10px; visibility: hidden; color: red"></span>')) +
                '    <strong style="color: ' + Palette[category.board_color] + ';">' + choice + '. </strong>' +
                '</span>' + processText(question.choices[x]) + '</a></li>');
        }

        yes_button.click(function () {
            modal.modal("hide");
        });

    } else if (question.type == QuesType.Answer) {
        show_button.click(function () {
            $("#question-explanation").collapse();
            var body = $(".modal-body");
            body.animate({"scroll-top": body.height()});

            show_button.css("display", "none");
            yes_button.css("display", "");
            no_button.css("display", "");
        });

        yes_button.click(function () {
            console.log("correct");
            answer_right(player_id);
            modal.modal("hide");
        });
        no_button.click(function () {
            console.log("wrong");
            answer_wrong(player_id);
            modal.modal("hide");
        });

    } else {    // QuesType.Task
        yes_button.click(function () {
            console.log("correct");
            answer_right(player_id);
            modal.modal("hide");
        });
        no_button.click(function () {
            console.log("wrong");
            answer_wrong(player_id);
            modal.modal("hide");
        });
    }

    choose_button.click(function () {
        chooseOtherPlayer(-1, function (other_player) {
            if (player_id == -1) {
                if (question.type == QuesType.Choice) {
                    yes_button.css("display", "none");
                    no_button.css("display", "none");
                    show_button.css("display", "none");
                    yes_button.find("div").html("完成");

                    $(".question-choice").click(function () {
                        if ($(this).hasClass("disabled")) return;
                        if ($(this).data("choice") === question.answer) {
                            console.log("correct");
                            answer_right(player_id);
                        } else {
                            console.log("wrong");
                            answer_wrong(player_id);
                        }
                        $(this).find("a span span").css("visibility", "visible");
                        $("#choice-" + question.answer).find("a span span").css("visibility", "visible");
                        $(".question-choice").addClass("disabled").find("a").css("color", "#2c3e50");

                        if (typeof question.explanation !== typeof undefined) {
                            $("#question-explanation").collapse();
                            var body = $(".modal-body");
                            body.animate({"scroll-top": body.height()});
                        }

                        yes_button.css("display", "");
                    });
                } else if (question.type == QuesType.Answer) {
                    yes_button.css("display", "none");
                    no_button.css("display", "none");
                    show_button.css("display", "");
                    yes_button.find("div").html("正确");
                    no_button.find("div").html("错误");
                } else {        // QuesType.Task
                    yes_button.css("display", "");
                    no_button.css("display", "");
                    show_button.css("display", "none");
                    yes_button.find("div").html("成功");
                    no_button.find("div").html("失败");
                }
            }
            player_id = other_player;
        });
    });

    modal.on("hidden.bs.modal", function () {
        if (category != game.categories.length - 2) {
            var index = category.questions.indexOf(question);
            if (index > -1) {
                category.questions.splice(index, 1);
            }
            var field = $("#total-questions").find("div");
            var total = parseInt(field.html(), 10);
            field.html((total + 1).toString());
        }
        callback(question);
        modal.remove();
    });
    modal.modal();
}

function fastAnswer() {
    game.state.current_player = -1;

    var category_id = game.categories.length - 1;
    if (game.categories[category_id].questions.length > 0) {
        var question_id = random(0, game.categories[category_id].questions.length - 1);
        setTimeout(function () {
            console.log("fast answer ", question_id);
            showFastAnswerQuestion(game.categories[category_id].questions[question_id], fastAnswer);
        }, 300);
    } else {
        alert("所有题目回答完毕!");
    }
}

function enterFastAnswerMode() {
    var result = confirm("确定开始抢答?");
    if (result == false) return;

    setTimeout(fastAnswer, 10);
}

function handlePassingEvents(player_id, position_id) {
    var position = game.board.positions[position_id];

    if (typeof position.extra !== typeof undefined) {
        game.players[game.state.current_player].score += position.extra;
        updateRanklist();
    }
}

function handleStoppingEvents(player_id, position_id) {
    var position = game.board.positions[position_id];

    if (typeof position.extra !== typeof undefined) {
        game.players[game.state.current_player].score += position.extra * 2;
        updateRanklist();
    }

    var show_question = function () {
        var category_id;
        do {
            category_id = random(0, game.categories.length - 2 - 1);
        } while (game.categories[category_id].questions.length === 0);
        var question_id = random(0, game.categories[category_id].questions.length - 1);
        setTimeout(function () {
            console.log("question ", category_id, question_id);
            showQuestion(game.categories[category_id].questions[question_id], function () {
                endTurn(player_id);
            });
        }, 500);
    };

    if (position.type == PosType.Item) {
        var item = random(0, game.items.length - 1);
        showItem(item, function () {
            game.players[game.state.current_player].items.push(item);
            show_question();
        });
    } else if (position.type == PosType.Event) {
        var event = random(0, game.events.length - 1);
        showEvent(event, function () {
                if (game.players[game.state.current_player].movie === true
                    && $.inArray(event, [2, 3, 6]) != -1) {
                    game.players[game.state.current_player].movie = false;
                    show_question();
                    return;
                }
                if (event == 0) {           // 走上街头: 分数+5
                    game.players[player_id].score += 5;
                    updateRanklist();
                } else if (event == 1) {    // 示威游行: 再次行动
                    game.players[player_id].next_turn = true;
                } else if (event == 2) {    // 军营镇压: 失去答题机会
                    setTimeout(function () {
                        endTurn(player_id);
                    }, 10);
                    return;
                } else if (event == 3) {    // 政府砍杀: 分数-10
                    game.players[player_id].score -= 10;
                    updateRanklist();
                } else if (event == 4) {    // 全国相应: 分数+10
                    game.players[player_id].score += 10;
                    updateRanklist();
                } else if (event == 5) {    // 信仰考验: 唱3首歌,分数+15
                    var category_id = game.categories.length - 2, question_id = 0;
                    showQuestion(game.categories[category_id].questions[question_id], function () {
                        show_question();
                    });
                    return;
                } else if (event == 6) {    // 校车扣押: 下回停止
                    game.players[player_id].stop_turn = true;
                } else if (event == 7) {    // 主席肯定: 向前5步
                    setTimeout(function () {
                        makeMove(player_id, 5);
                    }, 10);
                    return;
                } else if (event == 8) {    // 以退为进: 后退10步
                    setTimeout(function () {
                        makeMove(player_id, 10, true);
                    }, 10);
                    return;
                } else {

                }
                show_question();
            }
        );
    } else {
        show_question();
    }
}

function chooseOtherPlayer(player_id, callback) {
    var modal_raw_html;
    readFile("assets/choose_other_player.html", function (data) {
        modal_raw_html = data;
    });
    $("body").append(modal_raw_html);
    var modal = $("#choose-other-player-modal");
    var listview_raw_html;
    readFile("assets/player_listview.html", function (data) {
        listview_raw_html = data;
    });
    for (var x = 0; x < game.players.length; ++x) {
        if (x != player_id) {
            var player = game.players[x];
            var item = $("#listview-" + x.toString()).clone();
            item.addClass("modal-item");
            item.attr("id", "listview-modal-" + x.toString());
            $("#item-list").append(item).append("<hr>");

            $(String.format("#listview-modal-{0}", x)).click(function () {
                $(".modal-item").removeClass("active");
                $(this).addClass("active");
            });
        }
    }
    modal.on("hidden.bs.modal", function () {
        var item = $(".modal-item.active");
        var id = item.attr("id").substr(item.attr("id").lastIndexOf("-") + 1);
        callback(id);
        modal.remove();
    });
    modal.modal();
}

function openItemPanel(player_id, question, callback) {
    var items = game.players[player_id].items;

    var item_modal_raw_html;
    readFile("assets/item_modal.html", function (data) {
        item_modal_raw_html = data;
    });
    $("body").append(item_modal_raw_html);
    var modal = $("#item-modal");

    for (var x = 0; x < items.length; ++x) {
        if (question && $.inArray(items[x], [1, 4, 6, 9]) == -1
            || !question && $.inArray(items[x], [1, 4, 6, 9]) != -1) continue;

        var item = game.items[items[x]];
        var list_item = String.format(
            '<li class="fake-link nav-header item-list-item" id="{0}" style="margin-bottom: 10px;" data-type="{1}">' +
            '<a>' +
            '    <img style="width: 100px; height: 50px; object-fit: cover" src="assets/image/item/{2}">' +
            '    <div style="width: 130px; float:right; font-size: 18px; text-align: center">{3}</div>' +
            '</a></li>' +
            '<hr>', x, items[x], item.avatar, item.name);
        $("#item-list").append(list_item);
    }

    var item_card_raw_html;
    readFile("assets/item_card.html", function (data) {
        item_card_raw_html = data;
    });

    var container = $("#card-container");
    container.html(String.format(item_card_raw_html, 0, "", game.items[0].avatar, "", ""));
    container.css("visibility", "hidden");
    $("#item-list").css("height", 600);
    var yes_button = $("#item-yes-button");
    yes_button.attr("disabled", "disabled");

    var item_chosen = -1;

    $(".item-list-item").click(function () {
        var type = $(this).data("type");
        var item = game.items[type];
        var html = String.format(item_card_raw_html, type, item.name, item.avatar, item.quote, item.description);
        container.css("visibility", "visible");
        yes_button.removeAttr("disabled");
        item_chosen = type;
        container.html(html);
    });

    yes_button.click(function () {
        setTimeout(function () {
            var index = game.players[player_id].items.indexOf(item_chosen);
            if (index > -1) {
                game.players[player_id].items.splice(index, 1);
            }
            callback(player_id, item_chosen);
        }, 500);
        modal.modal("hide");
    });

    modal.on("hidden.bs.modal", function () {
        modal.remove();
    });
    modal.modal();
}

function showItem(item_id, callback) {
    console.log("item ", item_id);
    var item_panel_raw_html;
    readFile("assets/item_panel.html", function (data) {
        item_panel_raw_html = data;
    });
    $("body").append(item_panel_raw_html);
    var modal = $("#item-modal");

    var item_card_raw_html;
    readFile("assets/item_card.html", function (data) {
        item_card_raw_html = data;
    });

    var container = $("#card-container");
    var item = game.items[item_id];
    container.html(String.format(item_card_raw_html, item_id, item.name, item.avatar, item.quote, item.description));

    modal.on("hidden.bs.modal", function () {
        modal.remove();
        callback(item_id);
    });
    modal.modal();
}

function showEvent(event_id, callback) {
    console.log("event ", event_id);
    var item_panel_raw_html;
    readFile("assets/item_panel.html", function (data) {
        item_panel_raw_html = data;
    });
    $("body").append(item_panel_raw_html);
    var modal = $("#item-modal");
    modal.find("h4").html("发生事件!");

    var event_card_raw_html;
    readFile("assets/event_card.html", function (data) {
        event_card_raw_html = data;
    });

    var container = $("#card-container");
    var event = game.events[event_id];
    container.html(String.format(event_card_raw_html, event_id, event.name, event.description));
    container.find(".item-card").css("height", 300);

    if (game.players[game.state.current_player].movie
        && $.inArray(event_id, [2, 3, 6]) != -1) {
        $(".modal-footer").append('<div style="margin-top: 10px; font-size:16px">由于你富有爱国热情，本次负面事件对你无效</div>');
        container.append();
    }

    modal.on("hidden.bs.modal", function () {
        modal.remove();
        callback(event_id);
    });
    modal.modal();
}

function startTurn(player_id) {
    if (game.players[player_id].stop_turn) {
        game.players[player_id].stop_turn = false;
        setTimeout(function () {
            endTurn(player_id);
            startTurn(game.state.current_player);
        }, 10);
        return;
    }

    var index = [], containers = [];
    for (var x = 0; x < game.players.length; ++x) {
        index.push(x);
        containers.push($("#mapwidget-container-" + x.toString()));
    }
    containers[player_id].css("z-index", 1000);
    index.sort(function (x, y) {
        return containers[x].css("z-index") - containers[y].css("z-index");
    });
    for (x = 0; x < game.players.length; ++x) {
        containers[index[x]].css("z-index", x + 1);
    }
    placeMapWidgets();
    if (game.players[player_id].party != 0) {
        $(".control-label").append(" 使用党员的领导: 前进" + game.players[player_id].party.toString() + "步");
    }
}

function endTurn(player_id) {
    var is_full = true;
    for (var x = 0; x < game.categories.length - 2; ++x)
        if (game.categories[x].questions.length > 0) is_full = false;
    if (is_full) {
        alert("进入抢答环节!");
        setTimeout(fastAnswer, 10);
        return;
    }

    $(".control-label").html("单击以改变骰面");
    var player = game.players[player_id];
    if (player.next_turn) {
        player.next_turn = false;
        --game.state.current_player;
    }
    if (player.party != 0) {
        if (player.party == 1) player.party = 2;
        else if (player.party == 2) player.party = 9;
        else if (player.party == 9) player.party = 0;
    }

    game.state.current_player = (game.state.current_player + 1) % game.players.length;
    $("#start-round-button").removeAttr("disabled");
    updateRanklist();
}

function makeMove(player_id, steps, direction) {
    var player = game.players[player_id];
    if (typeof direction !== typeof undefined) {    // backward
        player.position -= 1;
        if (player.position < 0)
            player.position = game.board.positions.length - 1;
    } else {                                        // forward
        player.position = (player.position + 1) % game.board.positions.length;
    }
    placeMapWidgets();
    setTimeout(function () {
        if (steps > 1) {
            handlePassingEvents(player_id, player.position);
            makeMove(player_id, steps - 1, direction);
        } else {
            handleStoppingEvents(player_id, player.position);
        }
    }, 300);
}

// on document ready
$(function () {

    // put the map on its appropriate position
    var map = $("#map");
    var width = $("#main-page").width();
    var image_width = 1134, image_height = 850;
    var height = Math.min(width * image_height / image_width, window.innerHeight - 70);
    console.log(width, height);
    map.css("height", height);

    // adjust positions
    for (var position_name in game.board.positions) {
        var position = game.board.positions[position_name];
        position.x = position.x * width;
        position.y = position.y * height;
    }
    map.click(function (e) {
        console.log((e.pageX - map.position().left) / width, (e.pageY - map.position().top) / height);
    });

    // initialize player list
    var listview_raw_html;
    readFile("assets/player_listview.html", function (data) {
        listview_raw_html = data;
    });
    var mapwidget_raw_html =
        '<div class="item-container" id="mapwidget-container-{0}">' +
        '    <img src="assets/image/avatar/{1}" class="mapwidget player-avatar" id="mapwidget-{0}">' +
        '</div>';

    for (var x = 0; x < game.players.length; ++x) {
        var player = game.players[x];

        // add to list
        var listview_html = String.format(listview_raw_html,
            x, 1, player.name, 0, player.avatar);
        $("#score-ranklist").append(listview_html);

        // put players on map
        var mapwidget_html = String.format(mapwidget_raw_html,
            x, player.avatar);
        $("#main-page").append(mapwidget_html);
        $(String.format("#mapwidget-container-{0}", x)).css({
            width: width,
            height: height,
            "z-index": game.players.length - x
        });

        $(String.format("#listview-{0}", x)).click(function () {
            var id = this.id.substr(this.id.lastIndexOf("-") + 1);
            var container = $(String.format("#mapwidget-container-{0}", id));
            var z = container.css("z-index");
            container.css("z-index", 1000);
            animate($(String.format("#mapwidget-{0}", id)), "wobble", function () {
                container.css("z-index", z);
            });
        });
    }
    placeMapWidgets();
    updateRanklist();

    $("#dice-item-button").click(function () {
        openItemPanel(game.state.current_player, false, function (player_id, item_type) {
            console.log(player_id, item_type);
            if (item_type == 0) {           // 遥控骰子
                // actually nothing
                $(".control-label").append(" 使用遥控骰子");
            } else if (item_type == 1) {    // 华北书桌: 去掉1个错误答案

            } else if (item_type == 2) {    // 成立宣言: 结盟
                chooseOtherPlayer(player_id, function (other_player) {
                    console.log("other ", other_player);
                    if ($.inArray(game.players[other_player].allies, player_id) == -1) {
                        game.players[other_player].allies.push(player_id);
                    } else {
                        alert("已经结盟过了!");
                    }
                });
            } else if (item_type == 3) {    // 俄语歌谱: 连续答题
                $(".control-label").append(" 使用俄语歌谱");
                game.players[game.state.current_player].next_turn = true;
            } else if (item_type == 4) {    // 鲁迅支持: 直接答对

            } else if (item_type == 5) {    // 党员领导: 依次前进1 2 9步
                game.players[game.state.current_player].party = 1;
                $(".control-label").append(" 使用党员的领导: 前进1步");
            } else if (item_type == 6) {    // 市民食物: 分数翻倍

            } else if (item_type == 7) {    // 爱国电影: 消除下一个负面效果
                game.players[game.state.current_player].movie = true;
            } else if (item_type == 8) {    // 奸细情报: 使一个人答题无效
                chooseOtherPlayer(player_id, function (other_player) {
                    console.log("other ", other_player);
                    if (!game.players[other_player].spy) {
                        game.players[other_player].spy = true;
                    } else {
                        alert("对方下一回合已经无效了!");
                    }
                });
            } else if (item_type == 9) {    // 无线电台: 求助,对方拿到一半分数

            } else {

            }
        });
    });

    /*
     setTimeout(function () {
     test(0);
     }, 2000);
     */
});
