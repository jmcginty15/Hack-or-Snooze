$(async function () {
    // cache some selectors we'll be using quite a bit
    const $articlesContainer = $('#articles-container');
    const $allStoriesList = $("#all-articles-list");
    const $submitForm = $("#submit-form");
    const $filteredArticles = $("#filtered-articles");
    const $loginForm = $("#login-form");
    const $createAccountForm = $("#create-account-form");
    const $favoritedArticles = $('#favorited-articles');
    const $ownStories = $("#my-articles");
    const $navLogin = $("#nav-login");
    const $navLogOut = $("#nav-logout");
    const $navNewPost = $('#new-post');
    const $newPostCancel = $('#new-post-cancel');
    const $navAllPosts = $('#nav-all');
    const $navFavorites = $('#nav-favorites');
    const $navMyPosts = $('#nav-my-posts');
    const $navBar = $("#nav-loggedin");

    // global storyList variable
    let storyList = null;

    // global currentUser variable
    let currentUser = null;

    await checkIfLoggedIn();

    /**
     * Event listener for logging in.
     *  If successfully we will setup the user instance
     */

    $loginForm.on("submit", async function (evt) {
        evt.preventDefault(); // no page-refresh on submit

        // grab the username and password
        const username = $("#login-username").val();
        const password = $("#login-password").val();

        // call the login static method to build a user instance
        const userInstance = await User.login(username, password);
        // set the global user to the user instance
        currentUser = userInstance;
        syncCurrentUserToLocalStorage();
        loginAndSubmitForm();
    });

    /**
     * Event listener for signing up.
     *  If successfully we will setup a new user instance
     */

    $createAccountForm.on("submit", async function (evt) {
        evt.preventDefault(); // no page refresh

        // grab the required fields
        let name = $("#create-account-name").val();
        let username = $("#create-account-username").val();
        let password = $("#create-account-password").val();

        // call the create method, which calls the API and then builds a new user instance
        const newUser = await User.create(username, password, name);
        currentUser = newUser;
        syncCurrentUserToLocalStorage();
        loginAndSubmitForm();
    });

    /**
     * Log Out Functionality
     */

    $navLogOut.on("click", function () {
        // empty out local storage
        localStorage.clear();
        // refresh the page, clearing memory
        location.reload();
    });

    /**
     * Event Handler for Clicking Login
     */

    $navLogin.on("click", function () {
        // Show the Login and Create Account Forms
        $loginForm.slideToggle();
        $createAccountForm.slideToggle();
        $allStoriesList.toggle();
    });

    /**
     * Event handler for Navigation to Homepage
     */

    $("body").on("click", "#nav-all", async function () {
        hideElements();
        await generateStories();
        $allStoriesList.show();
    });

    /**
     * On page load, checks local storage to see if the user is already logged in.
     * Renders page information accordingly.
     */

    async function checkIfLoggedIn() {
        // let's see if we're logged in
        const token = localStorage.getItem("token");
        const username = localStorage.getItem("username");

        // if there is a token in localStorage, call User.getLoggedInUser
        //  to get an instance of User with the right details
        //  this is designed to run once, on page load
        currentUser = await User.getLoggedInUser(token, username);
        await generateStories();

        if (currentUser) {
            showNavForLoggedInUser();
        }
    }

    /**
     * A rendering function to run to reset the forms and hide the login info
     */

    async function loginAndSubmitForm() {
        // hide the forms for logging in and signing up
        $loginForm.hide();
        $createAccountForm.hide();

        // reset those forms
        $loginForm.trigger("reset");
        $createAccountForm.trigger("reset");

        // show the stories
        await generateStories(storyList.stories, true);
        $allStoriesList.show();

        // update the navigation bar
        showNavForLoggedInUser();
    }

    /**
     * A rendering function to call the StoryList.getStories static method,
     *  which will generate a storyListInstance. Then render it.
     */

    async function generateStories() {
        // get an instance of StoryList
        const storyListInstance = await StoryList.getStories();
        // update our global variable
        storyList = storyListInstance;
        generateHTML(storyList.stories, true, $allStoriesList);
    }

    /**
     * A function to render HTML for an individual Story instance
     */

    function generateStoryHTML(story) {
        let hostName = getHostName(story.url);
        let checkbox = '';

        // check favorites list for story id
        // if story is in favorites list, checkbox will be checked
        // checkboxes will not appear if no user is logged in
        if (currentUser) {
            let checked = '';
            if (currentUser.favorites.some(function (favorite) { return favorite.storyId === story.storyId; })) {
                checked = ' checked';
            }
            checkbox = `<small><input type="checkbox"${checked}>favorite</small>`;
        }

        // render story markup
        const storyMarkup = $(`
      <li id="${story.storyId}">
        <a class="article-link" href="${story.url}" target="a_blank">
          <strong>${story.title}</strong>
        </a>
        <small class="article-author">by ${story.author}</small>
        <small class="article-hostname ${hostName}">(${hostName})</small>
        <small class="article-username">posted by ${story.username}</small>
        ${checkbox}
      </li>
    `);

        return storyMarkup;
    }

    /* hide all elements in elementsArr */

    function hideElements() {
        const elementsArr = [
            $submitForm,
            $allStoriesList,
            $filteredArticles,
            $ownStories,
            $loginForm,
            $createAccountForm
        ];
        elementsArr.forEach($elem => $elem.hide());
    }

    function showNavForLoggedInUser() {
        $navLogin.hide();
        $navBar.show();
        $navNewPost.show();
    }

    /* simple function to pull the hostname from a URL */

    function getHostName(url) {
        let hostName;
        if (url.indexOf("://") > -1) {
            hostName = url.split("/")[2];
        } else {
            hostName = url.split("/")[0];
        }
        if (hostName.slice(0, 4) === "www.") {
            hostName = hostName.slice(4);
        }
        return hostName;
    }

    /* sync current user information to localStorage */

    function syncCurrentUserToLocalStorage() {
        if (currentUser) {
            localStorage.setItem("token", currentUser.loginToken);
            localStorage.setItem("username", currentUser.username);
        }
    }

    // event listener for story submission form
    $submitForm.on('submit', async function (evt) {
        evt.preventDefault();
        const $author = $('#author');
        const $title = $('#title');
        const $url = $('#url');

        // return if no user logged in
        if (!currentUser) { return; }

        // get story information
        // construct story object
        const newStory = {
            author: $author.val(),
            title: $title.val(),
            url: $url.val()
        }

        // add the new story to the storyList
        // addStory method returns the response from the API post request
        const response = await storyList.addStory(currentUser, newStory);

        // add the new story to the DOM and to currentUser.ownStories
        const storyHTML = generateStoryHTML(response);
        $allStoriesList.prepend(storyHTML);
        $ownStories.prepend(storyHTML);
        currentUser.ownStories.push(response);

        // clear input fields and hide form
        $author.val('');
        $title.val('');
        $url.val('');
        $submitForm.hide();
    });

    // event listener for new post button
    $navNewPost.on('click', function () {
        $submitForm.show();
    });

    // event listener for cancel button
    $newPostCancel.on('click', function () {
        $submitForm.hide();
    });

    // function for looping over a list of stories
    // order argument accepts a boolean value:
    // true to arrange the stories in the same order as in the stories array
    // false for reverse order
    function generateHTML(stories, order, list) {
        // empty the stories list
        list.empty();

        // loop through all stories and generate HTML
        for (let story of stories) {
            const result = generateStoryHTML(story);
            order ? list.append(result) : list.prepend(result);
        }
    }

    // event listener for 'all' button
    $navAllPosts.on('click', function () {
        $favoritedArticles.hide();
        $ownStories.hide();
        generateHTML(storyList.stories, true, $allStoriesList);
        $allStoriesList.show();
    });

    // event listener for 'favorites' button
    $navFavorites.on('click', function () {
        $allStoriesList.hide();
        $ownStories.hide();
        generateHTML(currentUser.favorites, false, $favoritedArticles);
        $favoritedArticles.show();
    });

    // event listener for 'my posts' button
    $navMyPosts.on('click', function () {
        $allStoriesList.hide();
        $favoritedArticles.hide();
        generateHTML(currentUser.ownStories, false, $ownStories);
        $ownStories.show();
    });

    // event listener for favorite checkboxes
    $articlesContainer.on('click', async function (evt) {
        const box = evt.target;
        if (box.type === 'checkbox') {
            const storyId = box.parentElement.parentElement.id;
            if (box.checked) {
                await currentUser.addFavorite(storyId);
            } else {
                await currentUser.removeFavorite(storyId);
            }
        }
    });
});