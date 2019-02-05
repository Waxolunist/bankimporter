;(function($) {

  (function() {
    // utils
    var wrapInArray = function(arg) {
        if ($.isArray(arg)) {
            return arg;
        }
        return [arg];
    };

    // templates
    var templates = {};

    var initTemplates = function() {
        var templatesArray = $.map($('script[type="text/template"]'), function(item) {
            return {
                name: $(item).data('template'),
                content: parseTemplate(item)
            };
        });
        $.each(templatesArray, function(idx, item) {
            templates[item.name] = item.content;
        });
    };

    var parseTemplate = function(element) {
        if (element.type === 'text/template') {
            return $(element).text().split(/\$\{(.+?)\}/g);
        }
        if (templates[element]) {
            return templates[element];
        } else {
            templates[element] = $(element).html().split(/\$\{(.+?)\}/g);
            return templates[element];
        }
    };

    var applyTemplate = function(templateName, data) {
        this.html(bindTemplate(templates[templateName], data));
    };

    var appendTemplate = function(templateName, data) {
        this.append(bindTemplate(templates[templateName], data));
    };

    var bindTemplate = function(parsedTemplateText, data) {
        return wrapInArray(data).map(function(props) {
            return parsedTemplateText.map(function(tok, i) {
                return (i % 2) ? props[tok] : tok;
            }).join('');
        });
    };

    // data binding
    var bindData = function(data) {
        var elementForBinding = this.find('*[data-bind=true]');
        var template = parseTemplate(elementForBinding);
        var boundTemplate = bindTemplate(template, data);
        elementForBinding.html(boundTemplate);
    };

    initTemplates();

    $.fn['applyTemplate'] = applyTemplate;
    $.fn['appendTemplate'] = appendTemplate;
    $.fn['bindData'] = bindData;

  })();
})(jQuery);
