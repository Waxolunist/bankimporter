jQuery(document).ready(function($) {

    var $toggle = $('#nav-toggle');
    var activeClass = 'is-active';

    // utils
    var toQuery = function(arg, addbase) {
        var addbase = addbase;
        var query = [];
        var base = '';
        for (var k in arg) {
            if (arg.hasOwnProperty(k)) {
                if (arg[k] !== undefined) {
                    query.push(k + '=' + arg[k]);
                } else if (addbase) {
                    base = k + '?';
                }
            }
        }
        return base + query.join('&');
    };

    var getHash = function() {
        return location.hash.replace('#', '').split(/\?|&/).reduce((prev, item) => {
            return Object.assign({
                [item.split('=')[0]]: item.split('=')[1]
            }, prev);
        }, {});
    };

    // common directives
    var paginate = function(baseselector, query, currentPage, totalItems, totalPages) {
        if (typeof query === 'object') {
            var queryString = toQuery($.extend(query, {page: ''}), true);
            hrefPrefix = queryString.split('page=')[0] + 'page=';
            hrefSuffix = queryString.split('page=')[1];
        } else {
          hrefPrefix = query;
          hrefSuffix = '';
        }
        $(baseselector + ' > .pagination-list').pagination({
            items: totalItems,
            itemsOnPage: 10,
            cssStyle: '',
            listStyle: 'pagination-list',
            ellipsePageSet: false,
            currentPage: currentPage,
            edges: 1,
            hrefTextPrefix: '#' + hrefPrefix,
            hrefTextSuffix: hrefSuffix,
            nextAtFront: true,
            nextText: null,
            prevText: null
        });
        $(baseselector + ' > .pagination-next').off().on('click', function() {
            hasher.setHash(hrefPrefix + (currentPage - 0 + 1 > totalPages ? currentPage : currentPage - 0 + 1));
        });
        $(baseselector + ' > .pagination-previous').off().on('click', function() {
            hasher.setHash(hrefPrefix + (currentPage - 1 < 1 ? currentPage : currentPage - 1));
        });
    };

    var sortableheaders = function(baseselector, hrefPrefix, queryobject) {
        $(baseselector + ' a[data-sort]').removeAttr('data-asc');
        $(baseselector + ' a[data-sort]').each(function(idx, el) {
            var queryobjectclone = $.extend({}, queryobject);
            var el$ = $(el);
            var datasort = el$.data('sort');
            if (queryobject.sort === datasort) {
                if (queryobject.asc === undefined) {
                  queryobject.asc = true;
                } else {
                  queryobject.asc = JSON.parse(queryobject.asc);
                }
                queryobjectclone.asc = !queryobject.asc;
                el$.attr('data-asc', !queryobject.asc);
            }
            queryobjectclone.sort = datasort;
            el$.attr('href', hrefPrefix + toQuery(queryobjectclone));
        });
    };

    // common dom
    var toggleActive = function() {
        $(this).toggleClass(activeClass);
    };

    // modals
    var initModals = function() {
        $('.modal-button').click(function() {
            var target = $(this).data('target');
            openModal(target);
        });

        $('.modal .close').click(function() {
            closeModal(this);
            return false;
        });
    };

    var openModal = function(modal) {
        $('html').addClass('is-clipped');
        $(modal).addClass('is-active');
    };

    var closeModal = function(element) {
        $('html').removeClass('is-clipped');
        var modal = $(element).closest('.modal');
        modal.removeClass('is-active');
        modal.find('.hideonclose').addClass('hidden');
    };

    // routes
    var importRoute = function(query) {
        var query = query || {};
        query = $.extend({'import': undefined}, query);
        var page = query.page || 1;
        var queryParamstring = toQuery(query, false);
        $.getJSON('/api/imports?' + queryParamstring, function(data) {
            $('#importtablebody').applyTemplate('importitem', data.items);
            sortableheaders('#importtablehead', '#import?', query);
            paginate('#importtablepagination', query, page, data.total, data.totalPages);
        });
        $.getJSON('/api/accounts', function(accounts) {
            $('#importform-accounts').applyTemplate('option', accounts);
            $('#exportform-accounts').applyTemplate('option', accounts);
            $('#account-filter').applyTemplate('option', accounts);
            var accountfilter = $('#account-filter');
            accountfilter.prepend($('<option value="all">All</option>'));
            accountfilter.val(query.account || 'all');
        });
    };

    var banksRoute = function(id) {
        $.getJSON('/api/banks', function(data) {
            $('#banktablebody').applyTemplate('bankitem', data);
        });
        if (id) {
            $.getJSON('/api/banks/' + id, function(data) {
                $('#bankeditformbody').applyTemplate('bankedit', data);
                openModal('#bankeditmodal');
            });
        }
    };

    var accountsRoute = function(id) {
        $.getJSON('/api/accounts', function(data) {
            $('#accounttablebody').applyTemplate('accountitem', data);
        });
        if (id) {
            $.getJSON('/api/accounts/' + id, function(data) {
                data.title = 'Edit Account';
                data.submit = 'Update';
                if (id === 'new') {
                    data.title = 'Add Account';
                    data.submit = 'Add';
                }
                $('#accountmodal').bindData(data);
                $.getJSON('/api/banks', function(banks) {
                    $('#accountform-bank-id').applyTemplate('option', banks);
                    $('#accountform-bank-id').val(data.bank_id);
                });
                $.getJSON('/api/csv', function(csv) {
                    $('#accountform-csvparser').applyTemplate('option', csv);
                    $('#accountform-csvparser').val(data.csvparser);
                });
                $.getJSON('/api/scraper', function(scraper) {
                    $('#accountform-webscraper').applyTemplate('option', scraper);
                    $('#accountform-webscraper').val(data.scraper);
                    $('#accountform-webscraper-arguments').applyTemplate('arguments', data.arguments);
                });
                openModal('#accountmodal');
            });
        } else {
            closeModal('#accountmodal');
        }
    };

    var csvschemaRoute = function(id) {
        var appendRow = function(data) {
            $('#csvformtablebody').appendTemplate('csvformaddrow', data);
        };

        var registerListeners = function() {
            $('#csvformaddrow').click(function() {
                appendRow({});
                $('#csvmodal .deleterow').off().on('click', function(e) {
                    console.log(this);
                    $(e.target).closest('tr').remove();
                })
            });
        };

        $.getJSON('/api/csv', function(data) {
            $('#csvtablebody').applyTemplate('csvitem', data);
        });
        if (id) {
            $.getJSON('/api/csv/' + id, function(data) {
                data.title = 'Edit CSV Schema';
                if (id === 'new') data.title = 'Add CSV Schema';
                $('#csvmodal').bindData(data);
                for (let field of data.fields) {
                    appendRow(field);
                }
                registerListeners();
                openModal('#csvmodal');
            });
        } else {
            closeModal('#csvmodal');
        }
    };

    var baseRoute = function(request) {
        return request.split(/\/|\?/)[0];
    };

    // route initialization
    var routed = function(request, data) {
        $('.navbar-menu').removeClass(activeClass);
        $('.navbar-menu .navbar-item').removeClass(activeClass);
        $('a.navbar-item[href^="#' + baseRoute(request) + '"]').addClass(activeClass);

        $('.content').removeClass(activeClass);
        $('#' + baseRoute(request)).addClass(activeClass);
    };

    var initRoutes = function() {
        //setup crossroads
        crossroads.addRoute('home');
        crossroads.addRoute('accounts/:id:', accountsRoute);
        crossroads.addRoute('banks/:id:', banksRoute);
        crossroads.addRoute('csvschemas/:id:', csvschemaRoute);
        crossroads.addRoute('import', importRoute);
        crossroads.addRoute('import{?query}', importRoute);

        crossroads.routed.add(console.log, console); //log all routes
        crossroads.routed.add(routed);

        //setup hasher
        function parseHash(newHash, oldHash) {
            if (newHash === '') {
                hasher.setHash('home');
                return;
            }
            crossroads.parse(newHash);
        }
        hasher.prependHash = '';
        hasher.initialized.add(parseHash); //parse initial hash
        hasher.changed.add(parseHash); //parse hash changes
        hasher.init(); //start listening for history change
    };

    // init event handlers
    $toggle.click(function() {
      toggleActive.apply($toggle);
      toggleActive.apply($('.navbar-menu'));
    });

    $('.navbar-menu .navbar-item').click(function() {
        toggleActive.apply($toggle);
        toggleActive.apply($('.navbar-menu.is-hidden-tablet'));
    });

    // forms
    $('#importform').submit(function(e) {
        e.preventDefault();
        $('#importform .error').addClass('hidden');
        var form = $(this)[0];
        var formData = new FormData(form);
        $.post({
            url: '/api/imports',
            data: formData,
            processData: false,
            contentType: false
        }).done(function(data) {
            closeModal(form);
            form.reset();
            importRoute();
        }).fail(function(jqXHR, textStatus, errorThrown) {
            $('#importform .error').removeClass('hidden');
            console.error(textStatus);
            console.error(errorThrown);
            form.reset();
        });
    });

    $('#importform input[name=autodownload]').change(function() {
      $('#importform input[name=csv]').prop('disabled', this.checked);
    });

    $('#bankaddform').submit(function(e) {
        e.preventDefault();
        var form = $(this)[0];
        var formData = new FormData(form);

        $.post({
            url: '/api/banks',
            data: formData,
            processData: false,
            contentType: false
        }).done(function(data) {
            closeModal(form);
            form.reset();
            importRoute();
        });
    });

    $('#csvform').submit(function(e) {
        e.preventDefault();
        var form = $(this)[0];
        var formData = new FormData(form);

        $.post({
            url: '/api/csv',
            data: formData,
            processData: false,
            contentType: false
        }).done(function(data) {
            closeModal(form);
            form.reset();
            $('#csvformtablebody').empty();
            csvschemaRoute();
            hasher.setHash('csvschemas');
        });
    });

    $('#bankeditform').submit(function(e) {
        e.preventDefault();
        var form = $(this)[0];
        var formData = new FormData(form);

        $.post({
            url: '/api/banks/' + formData.get('id'),
            data: formData,
            processData: false,
            contentType: false
        }).done(function(data) {
            closeModal(form);
            form.reset();
            hasher.setHash('banks');
        });
    });

    $('#accountform').submit(function(e) {
        e.preventDefault();
        var form = $(this)[0];
        var formData = new FormData(form);

        $.post({
            url: '/api/accounts/' + formData.get('id'),
            data: formData,
            processData: false,
            contentType: false
        }).done(function(data) {
            closeModal(form);
            form.reset();
            hasher.setHash('accounts');
        });
    });

    $('#exportform').submit(function(e) {
        var form = $(this)[0];
        closeModal(form);
    });

    $('#account-filter').change(function(e) {
        var hashobj = getHash();
        hashobj['account'] = this.value;
        hashobj['page'] = 1;
        hasher.setHash(toQuery(hashobj, true));
    });

    // init
    initModals();
    initRoutes();
});
