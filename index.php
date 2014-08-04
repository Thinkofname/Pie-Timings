<!DOCTYPE html>
<html>
<head lang="en">
    <meta charset="UTF-8">
    <title>Timings</title>
    <script src="http://d3js.org/d3.v3.min.js" charset="utf-8"></script>
    <script type="text/javascript" src="timings.js"></script>
</head>
<body>
<div id="timing-path" style="height:32px;">

</div>
<div id="chart">

</div>
<pre style="display:none" id="data"><?php
    $cache = '/tmp/timings_' . md5($_GET['url']);
    $file = file_exists($cache) ? trim(file_get_contents($cache)) : '';
    if (empty($file)) {
        $file = file_get_contents('http://paste.ubuntu.com/' . intval($_GET['url']));
        if (preg_match_all('/<pre>(.*?)<\/pre>/msi', $file, $m)) {
            $file = htmlentities(strip_tags($m[1][1]));
            file_put_contents($cache, $file);
        }
    }
    echo $file;
?></pre>
</body>
</html>