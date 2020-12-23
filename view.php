<?php 
  global $path;
  $v=1; 
  $openBEM_version = "10.1.0";
?>
<script src="https://cdn.jsdelivr.net/npm/handlebars@latest/dist/handlebars.js"></script>

<script language="javascript" type="text/javascript" src="https://cdn.jsdelivr.net/gh/carboncoop/openBEM@<?php echo $openBEM_version; ?>/datasets.js"></script>
<script language="javascript" type="text/javascript" src="https://cdn.jsdelivr.net/gh/carboncoop/openBEM@<?php echo $openBEM_version; ?>/openBEM.js"></script>

<script type="text/javascript" src="<?php echo $path;?>Modules/sapcompare/midterrace.js"></script>

<style>
.units {color:#888;}
.grn {background-color:#dff0d8 !important}
.yel {background-color:#fcf8e3 !important}
.red {background-color:#f2dede !important}
input[type=text] {
  width:40px!important;
  margin:0px!important;
}
select {
  margin:0px!important;
  width:85%
}
.delete-feed {
  margin-left:10px;
  cursor:pointer;
}
</style>

<div id="sap_compare"></div>

<script src="<?php echo $path;?>Modules/sapcompare/view.js?v=<?php echo $v; ?>"></script>
