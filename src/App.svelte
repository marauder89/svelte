<script>
  import Nav from "./component/layout/Nav.svelte";
  import Footer from "./component/layout/Footer.svelte";

  import Router from "svelte-spa-router";
  import routes from "./routes";
</script>

<main>
  <Nav />
  <Router {routes} />
  <Footer />
</main>
