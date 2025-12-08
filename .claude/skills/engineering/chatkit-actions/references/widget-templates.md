# Widget Templates Reference

## Overview

Widget templates (`.widget` files) define reusable, data-driven UI components that can be rendered in chat responses.

## Template Structure

```json
{
  "version": "1.0",
  "name": "widget_name",
  "template": "<jinja-templated JSON string>",
  "jsonSchema": {
    "$schema": "https://json-schema.org/draft/2020-12/schema",
    "type": "object",
    "properties": { ... },
    "required": [ ... ]
  }
}
```

## Template Syntax

Templates use Jinja2 syntax embedded in JSON:

```jinja
{
  "type": "ListView",
  "children": [
    {%- for item in items -%}
    {
      "type": "ListViewItem",
      "key": {{ item.id | tojson }},
      "children": [
        {
          "type": "Text",
          "value": {{ item.name | tojson }}
        }
      ]
    }{% if not loop.last %},{% endif %}
    {%- endfor -%}
  ]
}
```

## Component Reference

### ListView

```json
{
  "type": "ListView",
  "children": [ ... ListViewItem components ... ]
}
```

### ListViewItem

```json
{
  "type": "ListViewItem",
  "key": "unique-key",
  "gap": 3,
  "onClickAction": {
    "type": "action.type",
    "handler": "client" | "server",
    "payload": { ... }
  },
  "children": [ ... ]
}
```

### Row

```json
{
  "type": "Row",
  "gap": 3,
  "align": "center" | "start" | "end" | "stretch",
  "justify": "start" | "end" | "center" | "between" | "around",
  "children": [ ... ]
}
```

### Col

```json
{
  "type": "Col",
  "gap": 2,
  "flex": 1,
  "align": "stretch",
  "justify": "between",
  "padding": { "x": 4, "y": 3 },
  "children": [ ... ]
}
```

### Box

```json
{
  "type": "Box",
  "size": 25,
  "radius": "full" | "none" | "soft" | "round",
  "background": "#06b6d4",
  "border": { "color": "gray-900", "size": 1 },
  "padding": 0,
  "maxWidth": 450,
  "minWidth": 300,
  "children": [ ... ]
}
```

### Text

```json
{
  "type": "Text",
  "value": "Display text",
  "size": "xs" | "sm" | "md" | "lg" | "xl",
  "weight": "normal" | "semibold" | "bold",
  "color": "tertiary" | "emphasis" | "gray-300" | "gray-900",
  "maxLines": 4
}
```

### Image

```json
{
  "type": "Image",
  "src": "https://example.com/image.jpg",
  "alt": "Description",
  "width": 160,
  "height": 200,
  "fit": "cover" | "contain",
  "position": "top" | "center",
  "radius": "none" | "soft" | "round",
  "frame": true
}
```

### Icon

```json
{
  "type": "Icon",
  "name": "check" | "dot" | "chevron-right" | "sparkle" | ...,
  "size": "sm" | "md" | "lg" | "xl",
  "color": "success" | "gray-200" | "gray-300"
}
```

### Button

```json
{
  "type": "Button",
  "label": "Click me",
  "variant": "solid" | "outline" | "ghost",
  "color": "discovery" | "warning" | "success",
  "size": "sm" | "md" | "lg",
  "pill": true,
  "block": true,
  "iconStart": "icon-name",
  "iconEnd": "sparkle",
  "disabled": false,
  "onClickAction": {
    "type": "action.type",
    "handler": "client",
    "payload": { ... }
  }
}
```

## Python Usage

```python
from chatkit.widgets import WidgetTemplate, WidgetRoot

# Load template
template = WidgetTemplate.from_file("my_widget.widget")

# Build with data
widget: WidgetRoot = template.build(
    data={
        "items": [{"id": "1", "name": "First"}],
        "selected": None,
    }
)

# Yield as widget item
yield ThreadItemDoneEvent(
    item=WidgetItem(
        id=generate_id(),
        thread_id=thread.id,
        created_at=datetime.now(),
        widget=widget,
    )
)
```

## Conditional Rendering

```jinja
{%- if selected == item.id -%}
  { "type": "Icon", "name": "check", "color": "success" }
{%- else -%}
  { "type": "Icon", "name": "dot", "color": "gray-300" }
{%- endif -%}
```

## Disabling Actions

```jinja
"onClickAction": {% if selected %}null{% else %}{
  "type": "select",
  "handler": "client",
  "payload": { "id": {{ item.id | tojson }} }
}{% endif %}
```
