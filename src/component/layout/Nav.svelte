<script>
  import { link } from "svelte-spa-router";
</script>

<!-- NAVBAR -->
<nav class="navbar navbar-expand-lg navbar-light bg-white">
  <div class="container">
    <!-- Brand -->
    <a class="navbar-brand" href="./index.html">
      <img src="./assets/img/logo.svg" class="navbar-brand-img" alt="..." />
    </a>

    <!-- Navigation -->
    <ul class="navbar-nav">
      <li class="nav-item">
        <a class="nav-link" id="nav-myparty" href="/myparty" aria-haspopup="true" aria-expanded="false" use:link> 내파티 </a>
      </li>
      <li class="nav-item">
        <a class="nav-link" id="nav-find" href="#" aria-haspopup="true" aria-expanded="false"> 파티찾기 </a>
      </li>
      <li class="nav-item me-sm-4">
        <a class="nav-link" id="nav-manual" href="#" aria-haspopup="true" aria-expanded="false"> 사용법 </a>
      </li>
    </ul>

    <!-- Button -->
    <button class="navbar-btn btn btn-primary ms-md-11" href="./mypage.html" target="_blank">
      <i class="fa-regular fa-user fa-lg" />
    </button>
    <!--mobile nav-->
    <div class="container pt-6 nav_m border-nav-bottom">
      <ul class="d-flex justify-content-center list-unstyled ">
        <li class="me-6">
          <a id="nav-myparty" href="/myparty_login.html" aria-haspopup="true" aria-expanded="false">내파티</a>
        </li>
        <li class="me-6">
          <a id="nav-find" href="/find_leader.html" aria-haspopup="true" aria-expanded="false">파티찾기</a>
        </li>
        <li class="">
          <a id="nav-manual" href="/guide.html" aria-haspopup="true" aria-expanded="false">사용법</a>
        </li>
      </ul>
    </div>
  </div>
</nav>
