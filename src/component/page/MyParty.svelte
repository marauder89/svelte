<script>
  import { onMount } from "svelte";
  import axios from "axios";

  let partyList = [];
  let unusedOttList = [];

  async function getMyPartyList() {
    const res = await axios.get(`dummy/myPartyList.json`);
    partyList = await res.data.list;
  }

  async function getUnusedOttList() {
    const res = await axios.get(`dummy/unusedOttList.json`);
    unusedOttList = await res.data.list;
  }

  onMount(async () => {
    await getMyPartyList();
    await getUnusedOttList();
  });
</script>

<!-- CONTENT -->
<section class="pt-6 pt-md-8 pb-8 mb-md-8">
  <div class="container">
    <div class="row">
      <div class="col-12">
        <div class="d-flex justify-content-center mb-6 mb-md-8">
          <!-- Heading -->
          <h1 class="fw-bold mb-0 text-dark">내파티</h1>
        </div>
        <!-- / .row -->
        <!--banner-->
        <div id="event-banner" class="carousel carousel-dark slide" data-bs-ride="carousel">
          <div class="carousel-indicators">
            <button type="button" data-bs-target="#event-banner" data-bs-slide-to="0" class="active" aria-current="true" aria-label="Slide 1" />
            <button type="button" data-bs-target="#event-banner" data-bs-slide-to="1" aria-label="Slide 2" />
          </div>
          <div class="carousel-inner">
            <div class="carousel-item active" data-bs-interval="3000">
              <img src="./assets/img/sub/banner_1.png" class="w-100 banner-w" alt="banner" />
              <img src="./assets/img/sub/banner_1_m.png" class="w-100 banner-m" alt="banner" />
            </div>
            <div class="carousel-item" data-bs-interval="3000">
              <img src="./assets/img/sub/banner_2.png" class="w-100 banner-w" alt="banner" />
              <img src="./assets/img/sub/banner_2_m.png" class="w-100 banner-m" alt="banner" />
            </div>
          </div>
          <button class="carousel-control-prev" type="button" data-bs-target="#event-banner" data-bs-slide="prev">
            <span class="carousel-control-prev-icon" aria-hidden="true" />
            <span class="visually-hidden">Previous</span>
          </button>
          <button class="carousel-control-next" type="button" data-bs-target="#event-banner" data-bs-slide="next">
            <span class="carousel-control-next-icon" aria-hidden="true" />
            <span class="visually-hidden">Next</span>
          </button>
        </div>

        <section>
          <div class="mt-8 row flex-column mb-6">
            <div class="d-flex justify-content-between flex-wrap mt-4 gap-4">
              {#if partyList.length > 0}
                {#each partyList as list}
                  <!--파티장-->
                  <div class="myparty-card-{list.status} hover-white d-flex flex-wrap justify-content-between align-items-center">
                    <div class="d-flex flex-column">
                      <div class="d-flex flex-wrap justify-content-between align-items-center">
                        <div class="d-flex flex-wrap align-items-center">
                          <div>
                            <img src="./assets/img/ott/{list.platform}.png" class="ott-l me-3" alt={list.platform} />
                          </div>
                          <div class="fw-bold">{list.name}</div>
                        </div>
                      </div>
                      <div class="d-flex mt-4">
                        <div class="tag-leader me-2">파티장</div>
                        <div class="tag-price me-2">
                          {#if list.payment === "premium"}
                            <img src="./assets/img/emoji/star.png" class="emoji_xs me-1" alt="star" />프리미엄
                          {:else if list.payment === "standard"}
                            스탠다드
                          {/if}
                        </div>
                        {#if list.isMatching}
                          <div class="tag-matching">매칭중</div>
                        {/if}
                      </div>
                    </div>
                    <div class="p-2"><i class="fa-solid fa-chevron-right" /></div>
                  </div>
                {/each}
              {/if}

              <!-- 여백 처리를 위한 공간 div -->
              <div class="myparty-placeholder" />
            </div>
          </div>
        </section>

        <!--이용가능한 OTT-->
        <section class="border-top">
          <div class="mt-8 row flex-column">
            <div class="d-flex justify-content-center">아직 이용하고 있지 않은 OTT</div>
            <div class="d-flex justify-content-between flex-wrap mt-4 gap-4 ">
              {#if unusedOttList.length > 0}
                {#each unusedOttList as list}
                  <div class="myparty-card">
                    <div class="d-flex flex-wrap justify-content-between align-items-center">
                      <div class="d-flex flex-wrap align-items-center">
                        <div>
                          <img src="./assets/img/ott/{list.platform}.png" class="ott-l me-3" alt={list.platform} />
                        </div>
                        <div class="fw-bold">{list.name}</div>
                      </div>
                      {#if list.isImmediately}
                        <div class="tag">즉시매칭가능</div>
                      {/if}
                    </div>
                    <div class="price mt-4">월 {list.price.toLocaleString()}원~</div>
                  </div>
                {/each}
              {/if}

              <div class="myparty-placeholder" />
            </div>
            <div>
              <div class="myparty-help mt-6">
                ※ 이용하지 않는 OTT를 <span class="fw-bold text-primary">전부 이용하는데 N원</span>이면 돼요! (수수료별도)
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
    <!-- / .row -->
  </div>
  <!-- / .container -->
</section>

<!-- Modal HTML -->
<div class="modal fade" id="leader-modal" tabindex="-1" role="dialog">
  <div class="modal-dialog" role="document">
    <div class="modal-content">
      <div class="modal-header">
        <div class="modal-title" id="staticBackdropLabel">
          <div>파티만들기</div>
        </div>
        <button class="btn-close" data-bs-dismiss="modal" aria-label="Close"><i class="fa-solid fa-xmark" /></button>
      </div>
      <div class="modal-body" />
    </div>
  </div>
</div>
