/** Copyright (c) 2013 Jan Nicklas Released under MIT license */

/* global define: false, jQuery: true */
/* jshint sub:true */

// RequireJS amd factory
// http://stackoverflow.com/questions/10918063/how-to-make-a-jquery-plugin-loadable-with-requirejs#answer-11890239
(function (factory) {
  'use strict';
  if (typeof define === 'function' && define.amd) {
    // AMD. Register as an anonymous module.
    define(['jquery'], factory);
  } else {
    // Run without AMD
    factory(jQuery);
  }
}(function ($) {
  'use strict';
  // src/ariaMenu.js 
  /**
   * Returns true if the browser supports touch events
   *
   * @return {boolean}
   */
  function supportsTouch(){
    return 'ontouchstart' in window || 'onmsgesturechange' in window;
  }

  /**
   * The menu class
   *
   * @param {HTMLElement} item
   * @param {Array} [options]
   * @constructor
   */
  function AriaMenu(item, options) {
    this.settings = $.extend(this.defaults, options);
    this.$elem = $(item);
    this.init();
  }

  AriaMenu.prototype = {
    /* Default settings */
    // Single quoted keys are required for the google closure compiler:
    // http://closuretools.blogspot.de/2011/01/property-by-any-other-name-part-1.html
    defaults: {
      'focusClass': 'menuitem-focus',
      'visibleMenuClass': 'show-menu',
      'closeDelay': 100
    },

    events: {

      /* Triggered if the users clicks a link */
      linkMouseClick: function () {
      },

      /* Triggered if the users touches a link */
      linkTouch: function (event) {
        // Get the links parent element
        var $touchedListElement = $(this).parent();
        // Search for a sub menu and pick the first link
        var $firstLinkChildElement = $touchedListElement.find('>ul>li>a').first();
        // If a first sub menu could be found select it and prevent executing this link
        if ($firstLinkChildElement.length) {
          $firstLinkChildElement.focus();
          event.preventDefault();
        }
      },

       /* Triggered if the user moves his mouse over a list item */
      listItemMouseOver: function () {
        $(this).focus();
      },

      /* Triggered if the user moves his mouse away from a list item */
      listItemMouseOut: function () {
        if ($(this).is(':focus')) {
          $(this).blur();
        }
      },
      /**
       * Triggered if a list item receives focus
       * @param {jQuery.event=} event
       */
      listItemFocus: function (event) {
        var settings = event.data.settings;
        // Stop hiding this element (clear timeout from listItemBlur)
        debounce(this);

        // Show the sub menus
        $(this)
          .addClass(settings['focusClass'])
          .find('>ul')
          .addClass(settings['visibleMenuClass']);
      },

      /**
       * Triggered if the focus is lost
       * @param {jQuery.event=} event
       */
      listItemBlur: function (event) {
        var settings = event.data.settings;

        // Wait for a short moment and hide the sub menus
        debounce(this, function () {
          $(this).removeClass(settings['focusClass'])
            .find('>ul')
            .removeClass(settings['visibleMenuClass']);
        }, settings['closeDelay']);
      },

      /**
       * Triggered if a key event bubbles to a root menu list item
       * @param {jQuery.event=} event
       */
      keyDown: function (event) {
        var _this = event.data;

        // Escape pressed:
        if (event.which === 27) {
          event.preventDefault();
          // Hide the menu
          _this.closeMenu();
        }
        // Arrow keys pressed:
        else if (event.which >= 37 && event.which <= 40) {
          _this.events.arrowKeyDown.apply(this, arguments);
        }
      },

      /**
       * Triggered if an arrow key event bubbles to a root menu list item
       * @param {jQuery.event=} event
       */
      arrowKeyDown: function (event) {
        var _this = event.data;
        // Usually the event target is the focused link - so we pick the
        // parent to get the active listElement
        var $focusedListElement = $(event.target).closest('li'),
        // Get the focused list element Dimensions
          focusedListElementWidth = $focusedListElement.width(),
          focusedListElementHeight = $focusedListElement.height(),
        // Get the focused menu element
          $focusedMenu = $focusedListElement.closest('ul'),
        //  Get the parent element of the focused element (if one exists)
          $parentListElement = ($focusedListElement[0] === this) ? $() : $focusedMenu.closest('li'),
        // Get the parent menu of the focused element (if one exists)
          $parentMenu = $parentListElement.parent(),
        // Get the sub menu (if one exists)
          $subMenu = $focusedListElement.find('>ul'),
        // Create a virtual cursor with the position of the focused element
          virtualCursor = new VirtualCursor();

        // Move the cursor over the current focused element
        virtualCursor.moveOver($focusedListElement);

        // {right} key pressed
        // Move the virtual cursor to the right
        if (event.which === 39) {
          virtualCursor.left += focusedListElementWidth;
        }
        // {bottom} key pressed
        // Move the virtual cursor down
        else if (event.which === 40) {
          virtualCursor.top += focusedListElementHeight;
        }
        // {left} key pressed
        // Move the virtual cursor to the left
        else if (event.which === 37) {
          virtualCursor.left -= focusedListElementWidth;
        }
        // {top} key pressed
        // Move the virtual cursor up
        else {
          virtualCursor.top -= focusedListElementHeight;
        }

        // Select the element below the virtual cursor
        var $selectedListElement = $(virtualCursor.getElementBelowCursor('li')),
          selectedMenu = $selectedListElement.parent()[0] || false;

        // Check if the virtual cursor selected a sibling menu item
        if ($focusedMenu[0] === selectedMenu) {
          if (_this.selectListElement($selectedListElement)) {
            event.preventDefault();
          }
        }
        // Check if the virtual cursor selected a sub menu
        else if ($subMenu[0] === selectedMenu) {
          // Select the first element in the sub menu
          if (_this.selectListElement($selectedListElement)) {
            event.preventDefault();
          }
        }
        // Check if the virtual cursor selected a parent menu
        else if ($parentMenu[0] === selectedMenu) {
          // Select the parent list element
          if (_this.selectListElement($parentListElement)) {
            event.preventDefault();
          }
        }
      }
    },

    /**
     * Plugin initialization
     */
    init: function () {
      this.setAriaRoles();
      this.$elem
        // Listen to mouse and keyboard events
        .on('focusin', 'li', this, this.events.listItemFocus)
        .on('focusout', 'li', this, this.events.listItemBlur)
        .on('mouseover', 'a', this, this.events.listItemMouseOver)
        .on('mouseout', 'a', this, this.events.listItemMouseOut)
        .on('keydown', '>li', this, this.events.keyDown)
        .on('click', 'a', this, supportsTouch() ? this.events.linkTouch : this.events.linkMouseClick)
        // Disable the css fallback
        .removeClass('css-fallback')
        // Add aria-menu class
        .addClass('aria-menu')
        // Touch support
        .addClass((supportsTouch() ? 'has' : 'no') + '-touch');

    },

    /**
     * Helper function
     */
    find: function (selector) {
      return this.$elem.find(selector);
    },

    /**
     * Sets the focus to the first visible anchor child in this list element.
     * The element might be an `ul` or a `li` element containing an `a` anchor.
     *
     * @param {jQuery} $element
     * @returns {boolean}
     */
    selectListElement: function ($element) {
      return $element
        // Find the `a` tag starting from the `ul` or `li`:
        .find('>li>a, >a')
        // make sure that the anchor is visible
        .filter(':visible:first')
        // set the focus
        .focus()
        // as the filter selects only the first element the length
        // can be either 0 or 1
        .length === 1;
    },


    /**
     * Add Aria roles and poperties
     * http://http://www.w3.org/TR/wai-aria/
     */
    setAriaRoles: function () {
      // Add ARIA role to menu bar
      // http://www.w3.org/TR/wai-aria/roles#menubar
      this.$elem.attr('role', 'menubar');

      // Add ARIA role to menu items
      // http://www.w3.org/TR/wai-aria/roles#menuitem
      this.find('li').attr('role', 'menuitem');

      this.find('a+ul')
        // Adding aria-haspopup for appropriate items
        // http://www.w3.org/TR/wai-aria/states_and_properties#aria-haspopup
        .each(function () {
          $(this).prev('a').attr('aria-haspopup', 'true');
        });
    },

    /**
     * Closes the menu by removing the focus
     */
    closeMenu: function () {
      this.$elem.find(':focus').blur();
    }
  };

  /**
   * A virtual mouse cursor
   * which helps to support keyboard navigation
   *
   * @constructor
   */
  function VirtualCursor() {
    this.left = 0;
    this.top = 0;
  }

  VirtualCursor.prototype = {
    /**
     * Move the virtual cursor over the center of the given target
     *
     * @param {HTMLElement|jQuery} target
     */
    moveOver: function (target) {
      var $target = $(target),
        $document = $(document);

      // Set left and top value
      $.extend(this, $target.offset());

      // Move virtual cursor to the middle of the focused element
      // relative to the current scroll position
      this.top += 0.5 * $target.height() - $document.scrollTop();
      this.left += 0.5 * $target.width() - $document.scrollLeft();

    },
    /**
     * Return the element at the current courser position
     *
     * @param {string} [selector]
     * @returns {jQuery}
     */
    getElementBelowCursor: function (selector) {
      var $element = $(document.elementFromPoint(this.left, this.top));
      if (selector) {
        $element = $element.closest(selector);
      }
      return $element;
    }
  };

  /**
   * Execute a function once per element after a given delay
   *
   * @param {HTMLElement|jQuery} element
   * @param {function()=} [callback]
   * @param {number=} [delay]
   */
  function debounce(element, callback, delay) {
    clearTimeout(parseInt($(element).data('am-delay'), 10));
    if (callback && delay) {
      $(element).data('am-delay', setTimeout($.proxy(callback, element), delay));
    }
  }


  // jQuery plugin interface
  // Use quoted notation for the closure compiler ADVANCED_OPTIMIZATIONS mode
  $['fn']['ariaMenu'] = function (opt) {
    return this.each(function () {
      var item = $(this), instance = item.data('AriaMenu');
      if (!instance) {
        // create plugin instance and save it in data
        item.data('AriaMenu', new AriaMenu(this, opt));
      }
    });
  };

  
}));