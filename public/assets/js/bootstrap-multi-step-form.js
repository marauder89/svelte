var step = 1;

$(document).ready(function () {
    $(".submit").hide();
    stepProgress(step);
});

$(".next").on("click", function () {
    if (step < $(".step").length) {
        $(".step").show();
        $(".step")
            .not(":eq(" + step++ + ")")
            .hide();
        stepProgress(step);
        console.log(step);
    }
    hideAndDisabledButtons(step);
});
//파티해산 체크 유무
$(".check-next").on("click", function () {
    if ($("#checkbox").is(":checked")) {
        $(".party-check").show();
        $(".step, .modal-title, .border-bottom").hide();
    } else {
        $(".party-uncheck").show();
        $(".step").hide();
        $(".step, .modal-title, .border-bottom").hide();
    }
    hideAndDisabledButtons(step);
});
// ON CLICK BACK BUTTON
$(".back").on("click", function () {
    if (step > 1) {
        step = step - 2;
        $(".next").trigger("click");
    }
    hideAndDisabledButtons(step);
});

// CALCULATE PROGRESS BAR
stepProgress = function (currstep) {
    var percent = parseFloat(100 / ($(".step").length - 1)) * currstep;
    percent = percent.toFixed();
    if (percent <= 100) {
        $(".step-page")
            .html("Step " + currstep);
        $(".progress-bar")
            .css("width", percent + "%")
        $(".persent")
            .html(percent + "%");
    }
};

// DISPLAY AND HIDE "NEXT", "BACK" AND "SUMBIT" BUTTONS
hideAndDisabledButtons = function (step) {
    var limit = parseInt($(".step").length);
    $(".action").hide();

    if (step === 1) {
        $(".back").attr("disabled", true);
    }
    if (step < limit) {
        $(".next").show();
        $(".back").show();
        $(".progress-area").show();

    }
    if (step > 1) {
        $(".back").removeAttr("disabled");
    }
    if (step === 4) {
        $(".next").html("파티생성완료");
    }
    if (step === limit) {

        $(".next").hide();
        $(".progress-area").hide();
        console.log("이프시작전");
        $(".modal-footer").css('padding','0');
        if (!$("#bank-modal")) {
            $(".modal-title").hide();
            $(".border-bottom").hide();
        }
        if($("#bank-modal")) {
            $(".submit").show();
        }
        console.log("이프시작후");
        $(".back").hide();
        $("#modal-dialog").attr('class', 'modal-dialog modal-dialog-centered');
    }
};
