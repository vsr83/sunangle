/**
 * Class for the extraction of polygons from JSON and their visualization
 * on a HTML canvas.
 */
class EarthMap
{
    /**
     * Constructor. Initializes the polygon list.
     */
    constructor()
    {
        this.polygons = [];
    }

    /**
     * Set the projection associated to the map.
     * 
     * @param {*} projection 
     *     The projection.
     */
    setProjection(projection)
    {
        this.projection = projection;
        console.log("EarthMap.projection = ", projection);
    }

    /**
     * Set the canvas used to draw the Earth map.
     * 
     * @param {*} canvas 
     *     The canvas.
     */
    setCanvas(canvas)
    {
        this.canvas = canvas;
    }

    /**
     * Add polygon to the polygon list.
     * The method transforms the polygon from a list of lon-lat pairs to arrays
     * of lat and lon coordinates.
     * 
     * @param {*} polygon 
     *     Polygon as a list of lon-lat pairs.
     * @returns The number of points in the polygon.
     */
    addPolygon(polygon)
    {
        var numPoints = polygon.length;
        var pointsLon = [];
        var pointsLat = [];

        for (var indPoint = 0; indPoint < numPoints; indPoint++)
        {
            pointsLon.push(polygon[indPoint][0]);
            pointsLat.push(polygon[indPoint][1]);
        }

        this.polygons.push({lon : pointsLon, lat : pointsLat});

        return numPoints;
    }

    /**
     * Map longitude-latitude pair to location on the canvas.
     * 
     * @param {*} lon 
     *     The longitude (in degrees).
     * @param {*} lat 
     *     The latitude (in degrees).
     * @returns Location on the canvas.
     */
    locationToCanvas(lon, lat)
    {
        if (this.projection === "equirectangular")
        {
            return {x: this.canvas.width * ((lon + 180.0)/360.0),
                    y: this.canvas.height * ((180 - lat - 90.0)/180.0)};
        }
        else
        {
            var radius = 0.48 * Math.min(this.canvas.width, this.canvas.height);
            var r = radius * (90.0 - lat) / 180.0;

            var centerX = this.canvas.width * 0.5;
            var centerY = this.canvas.height * 0.5;

            //return {x: centerX + lon,
            //        y: centerY + r};
            return {x: centerX + r * Math.cos(2.0 * Math.PI * lon / 360.0),
                    y: centerY + r * Math.sin(2.0 * Math.PI * lon / 360.0)};
        }
    }

    /**
     * Map location on the canvas to a longitude-latitude pair.
     * 
     * @param {*} x 
     *     The x coordinate on the canvas.
     * @param {*} y 
     *     The y coordinate on the canvas.
     * @returns The lon-lat location (in degrees).
     */
    canvasToLocation(x, y)
    {
        var lon = (360.0 * (x / this.canvas.width)) - 180.0;
        var lat = (180.0 * (1 - y / this.canvas.height) - 90.0);

        if (this.projection === "equirectangular")
        {
            return {lon: lon,
                    lat: lat,
                    outside: false};
        }
        else
        {
            var radius = 0.48 * Math.min(this.canvas.width, this.canvas.height);
            var centerX = this.canvas.width * 0.5;
            var centerY = this.canvas.height * 0.5;

            var deltaX = x - centerX;
            var deltaY = y - centerY;

            var r = Math.sqrt(deltaX*deltaX + deltaY*deltaY);
            var lon = 360.0 * Math.atan2(deltaY, deltaX) / (2.0 * Math.PI);
            var lat = 90.0 - 180.0 * r / radius;

            var outside = false;
            if (r > radius)
            {
                outside = true;
            }

            return {lon: lon, lat: lat, outside: outside};
        }
    }

    /**
     * Transform polygon expressed in arrays of longitudes and latitudes into polygon on the 
     * canvas.
     * 
     * @param {*} polygon 
     *     The polygon expressed in longitude and latitude arrays (in degrees).
     * @returns The polygon expressed in x and y coordinates on the canvas.
     */
    polygonToCanvas(polygon)
    {
        var numPoints = polygon.lon.length;
        var canvasX = [];
        var canvasY = [];

        for (var indPoint = 0; indPoint < numPoints; indPoint++)
        {
            var canvasPoint = this.locationToCanvas(polygon.lon[indPoint], polygon.lat[indPoint]);
            canvasX.push(canvasPoint.x);
            canvasY.push(canvasPoint.y);
        }

        return {x: canvasX, y: canvasY};
    }

    /**
     * Read polygons from a JSON data structure.
     * 
     * @param {*} dataJSON 
     *     The JSON data structure.
     */
    processJSON(dataJSON)
    {
        var features = dataJSON.features;
        var numPointsTotal = 0;

        for (var index = 0; index < features.length; index++)
        {
            // Read polygons and multi-polygons.
            var feature = features[index];
            var geometry = feature.geometry;
            // TBD:
            //var properties = feature.properties;
            
            if (geometry.type === "Polygon")
            {
                var coordinates = geometry.coordinates[0];
                var numPoints = geometry.coordinates[0].length;
                numPointsTotal += this.addPolygon(coordinates);
            }
            if (geometry.type === "MultiPolygon")
            {
                var numPolygons = geometry.coordinates.length;

                for (var indPolygon = 0; indPolygon < numPolygons; indPolygon++)
                {
                    var coordinates = geometry.coordinates[indPolygon][0];
                    numPointsTotal += this.addPolygon(coordinates);
                }
            }
        }
        console.log("Added " + numPointsTotal + " points");
    }

    /**
     * Draw grid.
     * 
     * @param {*} ctx 
     *     The canvas context used for drawing.
     */
    drawGrid(ctx)
    {
        for (var lat = -90; lat < 90.0; lat += 30)
        {

            var startPoint = this.locationToCanvas(-180.0, lat);
            ctx.moveTo(startPoint.x, startPoint.y);

            for (var lon = -180.0; lon < 190.0; lon+=5)
            {
                var point = this.locationToCanvas(lon, lat);
                ctx.lineTo(point.x, point.y);
            }
            ctx.stroke();
        }

        for (var lon = -180.0; lon < 180.0; lon+=30)
        {
            var startPoint = this.locationToCanvas(lon, -90);
            ctx.moveTo(startPoint.x, startPoint.y);

            for (var lat = -90; lat <= 90.0; lat += 5)
            {
                var point = this.locationToCanvas(lon, lat);
                ctx.lineTo(point.x, point.y);
            }
            ctx.stroke();
        }
    }

    /**
     * Draw collected polygons to the canvas.
     * 
     * @param {*} ctx 
     *     The canvas context used for drawing.
     */
    draw(ctx)
    {
        for (var indPolygon = 0; indPolygon < this.polygons.length; indPolygon++)
        {
            // Since canvas size can change, we need to recompute the polygons on the canvas.
            // TBD: This could be done with the resize-element.

            var polygon = this.polygonToCanvas(this.polygons[indPolygon]);

            // Draw closed polygon.
            ctx.moveTo(polygon.x[0], polygon.y[0]);
            var numPoints = polygon.x.length;

            for (var indPoint = 1; indPoint < numPoints; indPoint++)
            {
                var startX = polygon.x[indPoint];
                var startY = polygon.y[indPoint];

                if (indPoint == numPoints - 1)
                {
                    var targetX = polygon.x[0];
                    var targetY = polygon.y[0];
                }
                else
                {
                    var targetX = polygon.x[indPoint + 1];
                    var targetY = polygon.y[indPoint + 1];
                }
                ctx.lineTo(targetX, targetY);
            }
        }
        ctx.stroke();
    }
}
