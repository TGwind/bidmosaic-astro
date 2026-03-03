<?php
/**
 * Astra Child Theme — functions.php
 */

// 加载父主题样式，再加载子主题样式（保证覆盖顺序正确）
add_action( 'wp_enqueue_scripts', function () {
    wp_enqueue_style(
        'astra-child-style',
        get_stylesheet_uri(),
        array( 'astra-theme-css' ),
        wp_get_theme()->get( 'Version' )
    );
} );

// Logo 无限滚动轮播 Shortcode
add_shortcode( 'mk_logo_marquee', function () {
    $upload_dir = wp_get_upload_dir();
    $base_url   = $upload_dir['baseurl'] . '/2025/12/';
    $total      = 25;

    ob_start();
    ?>
    <section class="mk-marquee" aria-label="合作伙伴">
      <div class="mk-marquee__track">
        <?php for ( $copy = 0; $copy < 2; $copy++ ) : ?>
          <?php for ( $i = 1; $i <= $total; $i++ ) : ?>
            <img
              src="<?php echo esc_url( $base_url . 'logo-' . $i . '.png' ); ?>"
              alt="Partner <?php echo $i; ?>"
              width="52" height="52"
              loading="lazy"
            />
          <?php endfor; ?>
        <?php endfor; ?>
      </div>
    </section>
    <?php
    return ob_get_clean();
} );

// Intersection Observer — 滚动触发 .animate-fade-up 入场动画
add_action( 'wp_footer', function () {
    ?>
    <script>
    (function(){
      if(window.matchMedia('(prefers-reduced-motion: reduce)').matches)return;
      var els=document.querySelectorAll('.animate-fade-up');
      if(!els.length)return;
      var io=new IntersectionObserver(function(entries){
        entries.forEach(function(e){
          if(e.isIntersecting){
            e.target.classList.add('is-visible');
            io.unobserve(e.target);
          }
        });
      },{threshold:0.15});
      els.forEach(function(el){io.observe(el);});
    })();
    </script>
    <?php
} );
