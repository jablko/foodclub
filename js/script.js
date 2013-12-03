$(document.body).scrollspy({ target: '.fc-sidebar' });
//$('.fc-sidebar').affix();

// Remember old comments on the server?
var comments = [];

var style = d3.select(document.head).append('style');
function updateStyle(who) {
  style.text([
    '[data-who="' + who + '"] { border: 3px solid #ccc }',
    '[data-who="' + who + '"] > :first-child { padding-left: 4px }',
    '[data-who="' + who + '"].danger { border-color: #b94a48 }',
    '[data-who="' + who + '"] .btn { display: inline-block }'].join(''));
}

updateStyle('');

var defaultFormat = d3.format(',');
var zeroFormat = d3.format(',f');
var twoFormat = d3.format(',.2f');

function weightFormat(arg) {
  switch (arg) {
    case 1/2:
      return '1/2';

    case 1/3:
      return '1/3';

    case 1/4:
      return '1/4';

    case 1/8:
      return '1/8';

    case 2/3:
      return '2/3';

    case 3/4:
      return '3/4';
  }

  var result = defaultFormat(arg);

  // More than two digits before decimal
  if (result.replace(/\..*|\D/g, '').length > 2) {
    return zeroFormat(arg);
  }

  // More than two decimal places
  if (result.replace(/[^.]*\.?/, '').length > 2) {
    return twoFormat(arg);
  }

  return result;
}

var priceFormat = d3.format('$,.2f');

function multiplyWeight(factor, weight) {
  if (weight) {

    return weight
      .split(' - ')

      .map(function (itm) {
          var units = itm.replace(/.*[^a-z]/i, '');

          return weightFormat(factor * itm
            .slice(0, itm.length - units.length)
            .split(' x ')

            .reduce(function (a, b) {

                return a * b
                  .split('/')
                  .reduce(function (a, b) { return a / b });
              }, 1)) + units;
        })

      .join(' - ');
  }

  if (factor % 1) {
    return weightFormat(factor);
  }

  return '';
}

function multiplyPrice(factor, dataset) { return factor * dataset.price * (1 + Number(dataset.tax) || 1) }

function parseQuantity(value, weight) {

  var units = value
    .toLowerCase()
    .replace(/^.*[^a-z]/, '');

  value = value.slice(0, value.length - units.length);
  if (/^\s*\d*(?:\.\d+|\d\s*\/\s*\d+)?\s*$/.test(value)) {
    value = Number(value
      .split('/')
      .reduce(function (a, b) { return a / b }));

    if (units) {
      switch (units) {
        case 'kg':
          value *= 1000;
          units = 'g';

          break;

        case 'ml':
          value /= 1000;
          units = 'l';

          break;
      }

      weight = weight
        .toLowerCase()
        .split(' - ');

      for (var idx = 0; idx < weight.length; idx += 1) {
        var itmUnits = weight[idx].replace(/.*[^a-z]/, '');

        var itmValue = weight[idx]
          .slice(0, weight[idx].length - itmUnits.length)
          .split(' x ')

          .reduce(function (a, b) {

              return a * b
                .split('/')
                .reduce(function (a, b) { return a / b });
            }, 1);

        switch (itmUnits) {
          case 'kg':
            itmValue *= 1000;
            itmUnits = 'g';

            break;

          case 'ml':
            itmValue /= 1000;
            itmUnits = 'l';

            break;
        }

        if (itmUnits === units) {
          value /= itmValue;

          break;
        }
      }
    }

    return value;
  }
}

function updateOrder(value, warning, itemTr) {
  if (value || warning || itemTr.datum().length) {
    itemTr.datum().forEach(function (d) {
        if (d[0][0].trim() && d[1] > 0) {
          value += d[1];
        } else {
          warning = true;
        }
      });

    if (value % 1) {
      warning = true;

      var orderTd = itemTr.select('.fc-order');
      orderTd.text(multiplyWeight(value, itemTr.property('dataset').weight));
    } else {

      var orderTd = itemTr.select('.fc-order');
      orderTd.html('<span><span class="badge">' + value + '</span> </span>');
    }

    itemTr
      .classed('success', !warning)
      .classed('warning', warning);
  } else {

    var orderTd = itemTr.select('.fc-order');
    orderTd.text('');

    itemTr
      .classed('success', false)
      .classed('warning', false);
  }
}

function updateDropdown(dropdownMenu) {
  dropdownMenu.html(function (d) {

      var result = '<span>' + multiplyWeight(d[1], d[2].property('dataset').weight) + '</span><span>' + priceFormat(multiplyPrice(d[1], d[2].property('dataset'))) + '</span>';
      if (!(d[1] % 1)) {
        return '<span class="badge">' + d[1] + '</span>' + result;
      }

      return result;
    });
}

function updateQuantity(badgeTd, weightTd, priceTd) {

  // value can be undefined (new rows, build form) and hard to check in all
  // callers because build row operates on possibly many rows at once
  badgeTd.html(function (d) { return !d[1] || d[1] % 1 ? '' : '<span><span class="badge">' + d[1] + '</span> </span>' });

  weightTd.text(function (d) { return multiplyWeight(d[1], d[2].property('dataset').weight) });

  priceTd.text(function (d) { return priceFormat(multiplyPrice(d[1], d[2].property('dataset'))) });
}

function isNew(d) { return d[3].property('rowIndex') > d[2].datum().length + 1 }

function buildRow(quantityTr, formTr) {
  quantityTr.attr('data-who', function (d) { return d[0][0].replace(/ +/g, ' ').trim() });

  updateQuantity(
    quantityTr.append('td'),
    quantityTr.append('td').attr('class', 'fc-weight'),
    quantityTr.append('td').attr('class', 'fc-price'));

  formTr
    .attr('data-who', function (d) { return d[0][0].replace(/ +/g, ' ').trim() })
    .classed('danger', function (d) { return (!d[0][0].trim() || !d[1]) && !isNew(d) });

  var td = formTr
    .append('td')
      .attr('class', 'fc-who-td');

  var button = td
    .append('button')
      .attr('class', 'btn')
      .attr('title', 'Delete row');

  button
    .append('span')
      .attr('class', 'fc-lid');

  button
    .append('span')
      .attr('class', 'fc-can');

  td
    .append('div')
      .attr('class', 'form-group')
      .classed('has-error', function (d) { return !d[0][0].trim() && !isNew(d) })
      .append('input')
        .attr('class', 'fc-who form-control')
        .attr('placeholder', 'Who? e.g. "J+M"')
        .property('value', function (d) { return d[0][0] });

  var div = formTr
    .append('td')
      .attr('class', 'fc-quantity-td')
      .append('div')
        .attr('class', 'dropdown form-group')
        .classed('has-error', function (d) { return !d[1] && !isNew(d) });

  div
    .append('input')
      .attr('class', 'fc-quantity form-control')
      .attr('placeholder', 'Quantity, e.g. "1/2" or "1kg"')
      .property('value', function (d) { return d[0][1] })
      .style('opacity', function (d) { return d[1] > 0 ? 0 : undefined });

  var dropdownMenu = div
    .append('div')
      .attr('class', 'dropdown-menu')
      .append('div');

  updateDropdown(dropdownMenu);

  formTr
    .append('td')
      .append('input')
        .attr('class', 'fc-comments form-control')
        .attr('placeholder', 'Comments, e.g. "Happy to share up to half with other buyers"')
        .property('value', function (d) { return d[0][2] })

        .each(function () {
            $(this).typeahead({ local: comments });

            this.parentNode.className = 'dropdown form-group';

            d3.select(this.parentNode)
              .select('.tt-dropdown-menu')
                .classed('dropdown-menu', true);
          });
}

function buildNewRow(quantityTbody, formTbody, d) {

  quantityTbody.append('tr');
  formTbody.append('tr');

  buildRow(
    quantityTbody.append('tr').datum(d),
    d[3] = formTbody.append('tr').datum(d).attr('class', 'fc-new'));
}

function buildForm(itemTr, data, who) {
  itemTr.each(function (d) {
      if (this.nextSibling && d3.select(this.nextSibling).classed('fc-form')) {

        var quantityTbody = d3.select(this.nextSibling.firstChild.firstChild.firstChild.firstChild.firstChild.firstChild);
        var formTbody = d3.select(this.nextSibling.firstChild.firstChild.nextSibling.firstChild);

        // Expand
        d3.select(this.nextSibling).classed('fc-collapse', false);
      } else {

        var td = d3.select(this.parentNode.insertBefore(document.createElement('tr'), this.nextSibling))
          .attr('class', d ? 'fc-being-ordered-tr fc-form' : 'fc-form')
          .append('td')
            .attr('class', 'well')
            .attr('colspan', 8);

        var quantityTbody = td
          .append('div')
            .attr('class', 'fc-quantity-wrapper')
            .append('div')
              .append('div')
                .append('table')
                  .attr('class', 'fc-quantity-table table table-condensed')
                  .append('tbody');

        var formTbody = td
          .append('table')
            .attr('class', 'fc-form-table table table-condensed')
            .append('tbody');

        // Visual tick when table has 3px border vs. row has 3px border
        quantityTbody.append('tr');
        formTbody.append('tr');

        if (d) {

          buildRow(
            quantityTbody.selectAll().data(d).enter().append('tr'),
            formTbody.selectAll().data(d).enter().append('tr').each(function (d) { d[3] = d3.select(this) }));
        } else {
          var d = this.__data__ = data[this.dataset.code] = [];
        }
      }

      for (var idx = 0; idx < d.length; idx += 1) {
        if (d[idx][0][0] === who) {
          break;
        }
      }

      if (idx < d.length) {
        d = d[idx];
      } else {

        var rows = formTbody.property('rows');
        if (rows.length > d.length + 1) {

          var d = rows[rows.length - 1].__data__;
          d[0][0] = who;

          var input = d[3].select('.fc-who');
          input.property('value', who);
        } else {

          var d = [[who, '', ''],, d3.select(this)];
          buildNewRow(quantityTbody, formTbody, d);
        }
      }

      if (itemTr.size() === 1) {
        d[3].select(who ? '.fc-quantity' : '.fc-who').node().focus();
      }
    });
}

d3.json('order.php', function (data) {

    var empty = true;
    for (var code in data) {
      if (data[code].length) {

        var itemTr = d3.select('[data-code="' + code + '"]');
        if (itemTr.property('dataset').price) {
          var empty = undefined;

          data[code] = data[code].map(function (d) {

              // Init comments

              var value = d[2]
                .replace(/ +/g, ' ')
                .trim();

              if (value && comments.indexOf(value) === -1) {
                comments.push(value);
              }

              return [d, parseQuantity(d[1], itemTr.property('dataset').weight), itemTr];
            });

          itemTr.datum(data[code]);

          updateOrder(0, false, itemTr);

          itemTr
            .classed('fc-being-ordered-tr', true)
            .classed('fc-expand', true);
        } else {
          delete data[code];
        }
      } else {
        delete data[code];
      }
    }

    var table = d3.select('.fc-catalog');

    // My Order

    var myOrderWrapper = d3.select('.fc-main')
      .append('div')
        .attr('class', 'fc-my-order-wrapper');

    var myOrderHeading = myOrderWrapper.append('h1');

    var quantityTbody = myOrderWrapper
      .append('table')
        .attr('class', 'fc-quantity-table table table-condensed')
        .append('tbody');

    var myOrderTable = myOrderWrapper
      .append('table')
        .attr('class', 'table table-condensed table-hover table-striped');

    myOrderTable.node().appendChild(table.select('thead').node().cloneNode(true));

    var myOrderTbody = myOrderTable.append('tbody');

    d3.select('.fc-main')

      // o  If target is .fc-quantity, hide dropdown
      // o  If value is positive, set opacity
      // o  If target is .fc-who or .fc-quantity, validate and set .has-error,
      //    .danger and .warning
      .on('blur', function () {

          var target = d3.select(d3.event.target);
          var d = target.datum();

          if (target.classed('fc-quantity')) {

            var dropdown = d3.select(target.property('parentNode'));
            dropdown.classed('open', false);

            if (d[1] > 0) {
              target.style('opacity', 0);
            }
          }
        }, true)

      .on('change', function () {

          var target = d3.select(d3.event.target);
          var d = target.datum();

          d3.xhr('order.php?code=' + d[2].property('dataset').code).post(JSON.stringify(d[2].datum().map(function (d) { return d[0] })));
        })

      // o  If target is .fc-quantity, set opacity
      // o  If value is positive, show dropdown
      .on('focus', function () {

          var target = d3.select(d3.event.target);
          var d = target.datum();

          if (target.classed('fc-quantity')) {
            target.style('opacity', undefined);

            if (d[1] > 0) {

              var dropdown = d3.select(target.property('parentNode'));
              dropdown.classed('open', true);
            }
          }
        }, true)

      // o  If target is .fc-quantity and value is positive, update dropdown
      // o  If target is .fc-quantity, hide/show dropdown
      // o  If target is .fc-who or .fc-quantity, update order
      // o  If target is .fc-who or .fc-quantity, validate and unset .has-error,
      //    .danger and .warning
      .on('input', function () {

          var target = d3.select(d3.event.target);
          var d = target.datum();

          if (target.classed('fc-who') || target.classed('fc-quantity') || isNew(d)) {
            switch (true) {
              case target.classed('fc-who'):
                d[0][0] = target.property('value');

                break;

              case target.classed('fc-quantity'):

                d[1] = parseQuantity(target.property('value'), d[2].property('dataset').weight);
                if (d[1] > 0) {

                  var dropdownMenu = d3.select(target.property('nextSibling').firstChild);
                  updateDropdown(dropdownMenu);

                  var dropdown = d3.select(target.property('parentNode'));
                  dropdown.classed('open', true);
                } else {

                  var dropdown = d3.select(target.property('parentNode'));
                  dropdown.classed('open', false);
                }

                if (whoDropdown.property('dataset').value) {
                  updateTotal(isNew(d) ? d3.round(multiplyPrice(d[1], d[2].property('dataset')), 2) : 0);
                }

                break;
            }

            if (isNew(d) && target.property('value')) {
              if (d[0][0].trim() && d[1] > 0) {
                updateOrder(d[1], false, d[2]);
              } else {
                updateOrder(0, true, d[2]);
              }
            } else {
              updateOrder(0, false, d[2]);
            }
          }

        // useCapture to trigger before .fc-catalog listener
        }, true);

    table

      .on('blur', function () {

          var target = d3.select(d3.event.target);
          var d = target.datum();

          // Don't validate until row is not new and focus leaves the row
          if (!isNew(d)) {
            if (target.classed('fc-who') && !target.property('value').trim()
                || target.classed('fc-quantity') && !d[1]) {

              var formGroup = d3.select(target.property('parentNode'));
              formGroup.classed('has-error', true);

              d[3].classed('danger', true);
            }

            setTimeout(function () {
                if (!d[3].node().contains(document.activeElement)) {
                  var formGroup = d[3].select('.fc-who-td .form-group');
                  formGroup.classed('has-error', !d[0][0].trim());

                  var formGroup = d[3].select('.fc-quantity-td .form-group');
                  formGroup.classed('has-error', !d[1]);

                  d[3].classed('danger', !d[0][0].trim() || !d[1]);
                }
              });
          }

          if (target.classed('fc-comments') && target.property('value') !== d[0][2]) {

            table.on('change')();
            d3.select('.fc-main').on('change')();
          }
        }, true)

      // o  If target is .fc-quantity and value is positive, update quantity
      //    display
      // o  If target is .fc-comments, update comments
      // o  Only inputs dispatch change events, XHR
      .on('change', function () {

          var target = d3.select(d3.event.target);
          var d = target.datum();

          if (isNew(d)) {
            d[2].datum().push(d);

            d[2].classed('fc-being-ordered-tr', true);
            d3.select(d[2].property('nextSibling')).classed('fc-being-ordered-tr', true);

            d[3].property('parentNode').removeChild(d[3].property('previousSibling'));

            var quantityTr = d[2].property('nextSibling').firstChild.firstChild.firstChild.firstChild.firstChild.rows[d[3].property('rowIndex')];
            quantityTr.parentNode.removeChild(quantityTr);

            d[3].classed('fc-new', false);
          }

          var value = d[0][0]
            .replace(/ +/g, ' ')
            .trim();

          if (value !== whoDropdown.property('dataset').value) {
            if (value) {
              whoChange(value);
            } else {

              whoDropdown.attr('data-value', '');
              whoValue.text('Who?');

              whoDropdownMenu
                .select('.fc-selected')
                  .classed('fc-selected', false);

              total.style('visibility', undefined);

              myOrderLi.classed('disabled', true);
              myOrderA.attr('href', undefined);

              updateStyle('');
            }
          }

          switch (true) {
            case target.classed('fc-who'):
              if (value) {
                updateWho();
              }

              var quantityTr = d[2].property('nextSibling').firstChild.firstChild.firstChild.firstChild.firstChild.rows[d[3].property('rowIndex')];
              quantityTr.dataset.who = value;

              d[3].attr('data-who', value);

              break;

            case target.classed('fc-quantity'):
              d[0][1] = target.property('value');

              if (d[1] > 0) {

                var quantityTr = d[2].property('nextSibling').firstChild.firstChild.firstChild.firstChild.firstChild.rows[d[3].property('rowIndex')];
                updateQuantity(
                  d3.select(quantityTr.cells[0]),
                  d3.select(quantityTr.cells[1]),
                  d3.select(quantityTr.cells[2]));
              }

              break;

            case target.classed('fc-comments'):
              d[0][2] = target.property('value');

              var value = target.property('value')
                .replace(/ +/g, ' ')
                .trim();

              if (comments.indexOf(value) === -1) {
                comments.push(value);
              }

              break;
          }
        })

      // o  If target is .fc-item, build/show form
      // o  Maybe add new row
      .on('click', function () {

          var target = d3.select(d3.event.target);
          while (target.node() !== this) {
            if (target.classed('btn')) {
              var d = target.datum();

              var index = d[2].datum().indexOf(d);
              d[2].datum().splice(index, 1);

              var quantityTr = d[2].property('nextSibling').firstChild.firstChild.firstChild.firstChild.firstChild.rows[d[3].property('rowIndex')];

              var quantityTbody = d3.select(quantityTr.parentNode);
              var formTbody = d3.select(d[3].property('parentNode'));

              quantityTr.parentNode.removeChild(quantityTr);

              d[3].remove();

              if (formTbody.property('rows').length === 1) {

                var d = [[whoDropdown.property('dataset').value, '', ''],, d[2]];
                buildNewRow(quantityTbody, formTbody, d);
              }

              updateOrder(0, false, d[2]);

              if (whoDropdown.property('dataset').value) {
                updateTotal(0);
              }

              if (!d[2].datum().length) {

                d[2].classed('fc-being-ordered-tr', false);
                d3.select(d[2].property('nextSibling')).classed('fc-being-ordered-tr', false);

                updateExpand();
              }

              d3.xhr('order.php?code=' + d[2].property('dataset').code).post(JSON.stringify(d[2].datum().map(function (d) { return d[0] })));

              break;
            }

            if (target.classed('fc-item')) {

              // Flash?
              if (target.property('dataset').price) {
                buildForm(target.classed('fc-expand', true), data, whoDropdown.property('dataset').value);

                expand
                  .attr('disabled', undefined)
                  .style('display', 'none');

                collapse.style('display', undefined);
              }

              break;
            }

            target = d3.select(target.property('parentNode'));
          }
        })

      .on('input', function () {

          var target = d3.select(d3.event.target);
          var d = target.datum();

          if (target.classed('fc-who') && d[0][0].trim()
              || target.classed('fc-quantity') && d[1] > 0) {

            var formGroup = d3.select(target.property('parentNode'));
            formGroup.classed('has-error', false);

            if (d[0][0].trim() && d[1] > 0) {
              d[3].classed('danger', false);
            }
          }
        });

    myOrderTbody

      .on('blur', function () {

          var target = d3.select(d3.event.target);
          var d = target.datum();

          if (target.classed('fc-quantity') && !d[1]) {

            var formGroup = d3.select(target.property('parentNode'));
            formGroup.classed('has-error', true);

            var myOrderTr = d3.select(formGroup.property('parentNode').parentNode);
            myOrderTr.classed('danger', true);
          }
        }, true)

      .on('change', function () {

          var target = d3.select(d3.event.target);
          var d = target.datum();

          if (target.classed('fc-quantity')) {
            d[0][1] = target.property('value');

            if (d[1] > 0) {

              // Minus table header
              var quantityTr = quantityTbody.property('rows')[target.property('parentNode').parentNode.parentNode.rowIndex - 1];
              updateQuantity(
                d3.select(quantityTr.cells[0]),
                d3.select(quantityTr.cells[1]),
                d3.select(quantityTr.cells[2]));
            }

            if (d[3]) {

              var input = d[3].select('.fc-quantity');
              input
                .property('value', target.property('value'))
                .style('opacity', d[1] > 0 ? 0 : undefined);

              var dropdownMenu = d3.select(input.property('nextSibling').firstChild);
              updateDropdown(dropdownMenu);

              var formGroup = d3.select(input.property('parentNode'));
              formGroup.classed('has-error', !d[1]);

              d[3].classed('danger', !d[0][0].trim() || !d[1]);

              if (d[1] > 0) {

                var quantityTr = d[2].property('nextSibling').firstChild.firstChild.firstChild.firstChild.firstChild.rows[d[3].property('rowIndex')];
                updateQuantity(
                  d3.select(quantityTr.cells[0]),
                  d3.select(quantityTr.cells[1]),
                  d3.select(quantityTr.cells[2]));
              }
            }
          }
        })

      .on('input', function () {

          var target = d3.select(d3.event.target);
          var d = target.datum();

          if (target.classed('fc-quantity') && d[1] > 0) {

            var formGroup = d3.select(target.property('parentNode'));
            formGroup.classed('has-error', false);

            var myOrderTr = d3.select(formGroup.property('parentNode').parentNode);
            myOrderTr.classed('danger', false);
          }
        });

    // Footer

    var footer = d3.select(document.body)
      .append('div')
        .attr('class', 'fc-footer')
        .append('div')
          .append('div');

    var popover = $(footer
      .append('div')

        .on('click', function () {

            var target = d3.select(d3.event.target);
            if (target.classed('close')) {
              popover.popover('hide');
            }
          })

        .append('button')
          .attr('class', 'btn btn-link')
          .text('Help?')
          .node());

    popover

      .popover({
        content: [
          '<button class="close">&times;</button>',
          '<ul class="list-unstyled">',
            '<li>Click on a row and fill in your name to add to the collective order.',
            '<li>In the quantity field, enter a whole number (e.g. "1"), a portion (e.g. "1/2"), or a weight (e.g. "1kg").',
            '<li>Use the comments field to coordinate with other buyers, e.g. "Happy to share up to half with other buyers", "Seeking other buyers to complete order", or "Happy to negotiate more quantity with other buyers".',
            '<li>Before the collective order is placed, quantities will be optimized based on your comments. (Items can be shared among buyers, but collectively we can only order items in whole numbers.)',
          '</ul>'].join(''),
        html: true,
        placement: 'top' })

      .on('hide.bs.popover', function () { localStorage.setItem('help', true) });

    if (!localStorage.getItem('help')) {
      popover.popover('show');
    }

    // Expand

    var div = footer
      .append('div')
        .attr('class', 'fc-expand-collapse');

    var expand = div
      .append('button')
        .attr('class', 'btn btn-default')
        .attr('disabled', empty)
        .text('Expand All');

    var collapse = div
      .append('button')
        .attr('class', 'btn btn-default')
        .style('display', 'none')
        .text('Collapse All');

    expand.on('click', function () {

        var itemTr = d3.selectAll('.fc-expand');
        buildForm(itemTr, data, whoDropdown.property('dataset').value);

        expand.style('display', 'none');
        collapse.style('display', undefined);
      });

    collapse.on('click', function () {
        d3.selectAll('.fc-form').classed('fc-collapse', true);

        expand.style('display', undefined);
        collapse.style('display', 'none');
      });

    function updateExpand() {
      if (d3.select('.fc-being-ordered-tr.fc-form:not(.fc-collapse)').empty()) {

        expand.style('display', undefined);
        collapse.style('display', 'none');

        var empty = true;
        for (var code in data) {
          if (data[code].length) {
            empty = undefined;
          }
        }

        if (empty) {
          expand.attr('disabled', true);
        }
      }
    }

    // Nav

    var nav = footer
      .append('ul')
        .attr('class', 'nav');

    nav
      .append('li')
        .attr('class', 'active')
        .append('a')
          .attr('href', '#')
          .text('All Items');

    nav
      .append('li')
        .append('a')
          .attr('href', '#being-ordered')
          .text('Items Being Ordered');

    var myOrderLi = nav
      .append('li')
        .attr('class', 'disabled');

    var myOrderA = myOrderLi
      .append('a')
        .text('My Order');

    // Who

    var whoDropdown = footer
      .append('div')
        .attr('class', 'dropdown fc-who-dropdown')
        .attr('data-value', '');

    var whoButton = whoDropdown
      .append('button')
        .attr('class', 'btn')
        .attr('data-toggle', 'dropdown'); // Via JavaScript fails :-P

    whoButton
      .append('div')
        .attr('class', 'fc-overflow')
        .append('b')
          .attr('class', 'caret');

    var whoValue = whoButton
      .append('span')
        .text('Who?');

    var whoDropdownMenu = whoDropdown
      .append('ul')
        .attr('class', 'dropdown-menu')
        .attr('role', 'menu')

        .on('click', function () {

            var target = d3.select(d3.event.target);
            var d = target.datum();

            if (target.property('nodeName').toLowerCase() === 'a') {
              if (target.text() !== whoDropdown.property('dataset').value) {
                whoChange(target.text());
              }

              if (!d3.select(document.body).classed('fc-my-order')) {
                d3.event.preventDefault();
              }
            }
          });

    //$(whoButton.node()).dropdown();

    function updateWho() {

      var who = [];
      for (var code in data) {
        data[code].forEach(function (d) {

            var value = d[0][0]
              .replace(/ +/g, ' ')
              .trim();

            if (value && who.indexOf(value) === -1) {
              who.push(value);
            }
          });
      }

      if (who.length) {

        var li = whoDropdownMenu
          .selectAll('li')
            .data(who);

        li
          .enter()
            .append('li')
              .append('a');

        li.attr('data-value', function (d) { return d });

        whoDropdownMenu
          .selectAll('a')
            .data(who)
            .attr('href', function (d) { return '#my-order/' + d })
            .text(function (d) { return d });
      }

      whoButton.attr('disabled', who.length ? undefined : true);
    }

    updateWho();

    // Total

    var total = footer
      .append('div')
        .attr('class', 'fc-total')
        .text('Total: ');

    var totalValue = total
      .append('span')
        .attr('class', 'fc-total-value')
        .text(priceFormat(0));

    function updateTotal(value) {
      for (var code in data) {
        for (var idx = 0; idx < data[code].length; idx += 1) {

          var d = data[code][idx];
          if (d[0][0].replace(/ +/g, ' ').trim() === whoDropdown.property('dataset').value && d[1] > 0) {
            value += d3.round(multiplyPrice(d[1], d[2].property('dataset')), 2);

            break;
          }
        }
      }

      totalValue.text(priceFormat(value));
      total.style('visibility', 'visible');
    }

    // o  Update total
    // o  Enable my order nav
    // o  If location is my order, update location
    function whoChange(value) {

      whoDropdown.attr('data-value', value);
      whoValue.text(value);

      whoDropdownMenu
        .select('.fc-selected')
          .classed('fc-selected', false);

      whoDropdownMenu
        .select('[data-value="' + value + '"]')
          .classed('fc-selected', true);

      updateTotal(0);

      myOrderLi.classed('disabled', false);
      myOrderA.attr('href', '#my-order/' + value);

      updateStyle(value);
    }

    // o  If location is my order, update my order and who select
    // o  Set .being-ordered and .my-order classes
    // o  Update .active nav
    function hashchange() {

      nav
        .select('.active')
          .classed('active', false);

      switch (true) {
        default:
          d3.select(document.body)
            .classed('fc-being-ordered', false)
            .classed('fc-my-order', false);

          if (!d3.select('.fc-form:not(.fc-collapse)').empty()) {

            expand
              .attr('disabled', undefined)
              .style('display', 'none');

            collapse.style('display', undefined);
          } else {
            if (!d3.select('.fc-expand').empty()) {
              expand.attr('disabled', undefined);
            }
          }

          d3.select(nav.select('[href="#"]').property('parentNode')).classed('active', true);

          scroll(document.body.scrollWidth, pageYOffset);

          break;

        case location.hash === '#being-ordered':
          d3.select(document.body)
            .classed('fc-being-ordered', true)
            .classed('fc-my-order', false);

          updateExpand();

          d3.select(nav.select('[href="#being-ordered"]').property('parentNode')).classed('active', true);

          break;

        case location.hash.length > 10 && location.hash.slice(0, 10) === '#my-order/':
          whoChange(location.hash.slice(10));

          myOrderHeading.text(whoDropdown.property('dataset').value);

          var myOrderData = [];
          for (var code in data) {
            for (var idx = 0; idx < data[code].length; idx += 1) {

              var d = data[code][idx];
              if (d[0][0].replace(/ +/g, ' ').trim() === whoDropdown.property('dataset').value) {
                myOrderData.push(d);

                break;
              }
            }
          }

          var quantityTr = quantityTbody
            .selectAll('tr')
              .data(myOrderData);

          quantityTr.exit().remove();

          quantityTr.each(function (d) {
              if (d[1] > 0) {

                updateQuantity(
                  d3.select(this.cells[0]).datum(d),
                  d3.select(this.cells[1]).datum(d),
                  d3.select(this.cells[2]).datum(d));
              }
            });

          quantityTr = quantityTr
            .enter()
              .append('tr');

          updateQuantity(
            quantityTr.append('td'),
            quantityTr.append('td').attr('class', 'fc-weight'),
            quantityTr.append('td').attr('class', 'fc-price'));

          var myOrderTr = myOrderTbody
            .selectAll('tr')
              .data(myOrderData);

          myOrderTr.exit().remove();

          var enter = myOrderTr
            .enter()
              .append('tr');

          myOrderTr
            .attr('title', function (d) { return d[2].attr('title') })
            .classed('danger', function (d) { return !d[0][0].trim() || !d[1] });

          var div = myOrderTr
            .selectAll('div')
              .data(function (d) { return Array.prototype.slice.call(d[2].property('children'), 0, 7) });

          div.text(function (d) { return d.textContent });

          div
            .enter()
              .append('td')
                .attr('class', function (d) { return d.className })
                .append('div')
                  .text(function (d) { return d.textContent });

          var div = enter
            .append('td')
              .attr('class', 'fc-quantity-td')
              .append('div')
                .attr('class', 'dropdown form-group');

          myOrderTbody
            .selectAll('.form-group')
              .data(myOrderData)
              .classed('has-error', function (d) { return !d[1] });

          div
            .append('input')
              .attr('class', 'fc-quantity form-control')
              .attr('placeholder', 'Quantity, e.g. "1/2" or "1kg"');

          myOrderTbody
            .selectAll('.form-control')
              .data(myOrderData)
              .property('value', function (d) { return d[0][1] })
              .style('opacity', function (d) { return d[1] > 0 ? 0 : undefined });

          div
            .append('div')
              .attr('class', 'dropdown-menu')
              .append('div');

          var dropdownMenu = myOrderTbody.selectAll('.dropdown-menu > div');
          updateDropdown(dropdownMenu.data(myOrderData));

          d3.select(document.body).classed('fc-my-order', true);

          d3.select(nav.select('[href="' + location.hash + '"]').property('parentNode')).classed('active', true);

          break;
      }
    }

    var mouse;
    var save = pageXOffset;
    var timeout;

    d3.select(window)

      .on('hashchange', hashchange)
      .on('mousedown', function () { mouse = true })

      .on('mouseup', function () {

          mouse = false;
          save = pageXOffset;
        })

      .on('scroll', function () {
          switch (true) {
            case pageXOffset > save:
              if (!mouse || !timeout) {
                timeout = setTimeout(function () { timeout = undefined });
                save = pageXOffset;
              }

              scroll(document.body.scrollWidth, pageYOffset);

              break;

            case pageXOffset < save:
              if (!mouse || !timeout) {
                timeout = setTimeout(function () { timeout = undefined });
                save = pageXOffset;
              }

              scroll(0, pageYOffset);

              break;
          }
        });

    hashchange();
  });
